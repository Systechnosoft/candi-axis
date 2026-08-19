/**
 * Standalone bootstrap-admin script (Supabase Auth version).
 * Creates/ensures the Super Admin user in both Supabase Auth and the CA public.users table.
 *
 * Usage: ts-node src/bootstrap/bootstrap-admin.ts
 *
 * Behavior:
 * - If BOOTSTRAP_ADMIN_EMAIL is not set, exits cleanly.
 * - Creates or locates the user in Supabase Auth via Admin API.
 * - Creates or links the corresponding CA users row via supabase_auth_user_id.
 * - Ensures super_admin role, access_modules, and role_module_access entries.
 * - Fully idempotent.
 */

import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as dns from 'dns';

dns.setDefaultResultOrder('ipv4first');
dotenv.config();

const CA_MODULES = [
  { code: 'dashboard', name: 'Dashboard', sort: 10 },
  { code: 'organisations', name: 'Organisations', sort: 20 },
  { code: 'users', name: 'Users', sort: 30 },
  { code: 'roles', name: 'Roles', sort: 40 },
  { code: 'requisitions', name: 'Requisitions', sort: 50 },
  { code: 'job_descriptions', name: 'Job Descriptions', sort: 60 },
  { code: 'job_postings', name: 'Job Postings', sort: 65 },
  { code: 'candidates', name: 'Candidates', sort: 70 },
  { code: 'applications', name: 'Applications', sort: 75 },
  { code: 'documents', name: 'Documents', sort: 80 },
  { code: 'duplicate_matches', name: 'Duplicate Matches', sort: 90 },
  { code: 'interviews', name: 'Interviews', sort: 120 },
  { code: 'feedback', name: 'Feedback', sort: 130 },
  { code: 'offers', name: 'Offers', sort: 140 },
  { code: 'audit_logs', name: 'Audit Logs', sort: 150 },
  { code: 'reports', name: 'Reports', sort: 160 },
  { code: 'admin', name: 'Admin Config', sort: 170 },
  { code: 'tags', name: 'Tags', sort: 180 },
];

async function run() {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim();
  if (!email) {
    console.log(
      '[bootstrap] BOOTSTRAP_ADMIN_EMAIL not set — skipping bootstrap admin. Continuing...',
    );
    process.exit(0);
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const databaseUrl = process.env.DATABASE_URL;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      '[bootstrap] ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for bootstrap.',
    );
    process.exit(1);
  }
  if (!databaseUrl) {
    console.error('[bootstrap] ERROR: DATABASE_URL is required.');
    process.exit(1);
  }

  const name = (process.env.BOOTSTRAP_ADMIN_NAME || 'System Admin').trim();
  const normalized = email.toLowerCase();

  // -- Supabase Admin Client
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // -- Postgres Client
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  console.log('[bootstrap] Connected to database.');

  try {
    // 1. ensure super_admin role
    let roleId: string;
    const roleResult = await client.query(
      `SELECT id FROM ca_roles WHERE code = 'super_admin' LIMIT 1`,
    );
    if (roleResult.rows[0]) {
      roleId = roleResult.rows[0].id;
      console.log('[bootstrap] super_admin role already exists.');
    } else {
      const ins = await client.query(
        `INSERT INTO ca_roles (code, name, description, is_system, is_active)
         VALUES ('super_admin', 'Super Admin', 'System-level privileged role', true, true)
         RETURNING id`,
      );
      roleId = ins.rows[0].id;
      console.log('[bootstrap] super_admin role created.');
    }

    // 2. ensure access modules
    for (const mod of CA_MODULES) {
      await client.query(
        `INSERT INTO ca_modules (code, name, is_system, is_active, sort_order)
         VALUES ($1, $2, true, true, $3)
         ON CONFLICT (code) DO NOTHING`,
        [mod.code, mod.name, mod.sort],
      );
    }
    console.log('[bootstrap] Access modules ensured.');

    // 3. ensure super_admin module access
    // Scoped strictly for Super Admin initialisation:
    // Only active, non-platform modules are granted here since super_admin is CUSTOMER scoped.
    const modules = await client.query(`SELECT id FROM ca_modules WHERE is_active = true AND is_platform_only = false`);
    for (const mod of modules.rows) {
      await client.query(
        `INSERT INTO ca_role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete)
         VALUES ($1, $2, true, true, true, true)
         ON CONFLICT (role_id, module_id) DO NOTHING`,
        [roleId, mod.id],
      );
    }
    console.log('[bootstrap] super_admin module access ensured.');

    // 4. Ensure Supabase Auth user
    let supabaseAuthUserId: string;
    const { data: listData, error: listError } =
      await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error(
        '[bootstrap] Could not list Supabase Auth users:',
        listError.message,
      );
      process.exit(1);
    }

    const existingAuthUser = listData.users.find(
      (u) => u.email?.toLowerCase() === normalized,
    );
    if (existingAuthUser) {
      supabaseAuthUserId = existingAuthUser.id;
      console.log(`[bootstrap] Supabase Auth user already exists: ${email}`);
    } else {
      const { data: created, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: normalized,
          email_confirm: true,
          password: 'Password123!',
          user_metadata: { full_name: name },
        });
      if (createError) {
        console.error(
          '[bootstrap] Failed to create Supabase Auth user:',
          createError.message,
        );
        process.exit(1);
      }
      supabaseAuthUserId = created.user.id;
      console.log(
        `[bootstrap] Supabase Auth user created: ${email} (id: ${supabaseAuthUserId})`,
      );
    }

    // 5. Ensure CA user
    const existingCA = await client.query(
      `SELECT id FROM ca_users WHERE email_normalized = $1 LIMIT 1`,
      [normalized],
    );

    let userId: string;
    if (existingCA.rows[0]) {
      userId = existingCA.rows[0].id;
      console.log(`[bootstrap] CA user already exists (${email}).`);
      await client.query(
        `UPDATE ca_users SET supabase_auth_user_id = $1 WHERE id = $2 AND supabase_auth_user_id IS NULL`,
        [supabaseAuthUserId, userId],
      );
    } else {
      const ins = await client.query(
        `INSERT INTO ca_users (email, email_normalized, full_name, status, is_active, supabase_auth_user_id, org_id)
         VALUES ($1, $2, $3, 'active', true, $4, NULL)
         RETURNING id`,
        [normalized, normalized, name, supabaseAuthUserId],
      );
      userId = ins.rows[0].id;
      console.log(`[bootstrap] CA user created: ${email}`);
    }

    // 6. Ensure super_admin role assignment
    await client.query(
      `INSERT INTO ca_user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, roleId],
    );
    console.log('[bootstrap] super_admin role assignment ensured.');
    console.log('[bootstrap] Bootstrap complete.');
  } catch (err) {
    console.error('[bootstrap] Failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
