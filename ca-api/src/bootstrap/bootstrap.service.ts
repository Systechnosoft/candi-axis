import { Injectable, Logger, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PG_POOL } from '../infrastructure/database/database.module';
import { AuditService } from '../modules/audit/audit.service';

const ATS_MODULES = [
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

@Injectable()
export class BootstrapService {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async run(): Promise<void> {
    this.logger.log('Running ATS bootstrap...');

    const superAdminRole = await this.ensureSuperAdminRole();
    await this.ensureAccessModules();
    await this.ensureSuperAdminModuleAccess(superAdminRole.id);
    await this.ensureBootstrapUser(superAdminRole.id);

    this.logger.log('Bootstrap complete.');
  }

  private async ensureSuperAdminRole() {
    const existing = await this.pool.query(
      `SELECT id FROM roles WHERE code = 'super_admin' LIMIT 1`,
    );
    if (existing.rows[0]) {
      this.logger.debug('super_admin role already exists.');
      return existing.rows[0];
    }

    const result = await this.pool.query(
      `INSERT INTO roles (code, name, description, is_system, is_active)
       VALUES ('super_admin', 'Super Admin', 'System-level privileged role', true, true)
       RETURNING id`,
    );
    this.logger.log('Created super_admin role.');
    return result.rows[0];
  }

  private async ensureAccessModules() {
    for (const mod of ATS_MODULES) {
      await this.pool.query(
        `INSERT INTO modules (code, name, is_system, is_active, sort_order)
         VALUES ($1, $2, true, true, $3)
         ON CONFLICT (code) DO NOTHING`,
        [mod.code, mod.name, mod.sort],
      );
    }
    this.logger.debug('Access modules ensured.');
  }

  private async ensureSuperAdminModuleAccess(roleId: string) {
    const modules = await this.pool.query(`SELECT id FROM modules`);
    for (const mod of modules.rows) {
      await this.pool.query(
        `INSERT INTO role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete)
         VALUES ($1, $2, true, true, true, true)
         ON CONFLICT (role_id, module_id) DO NOTHING`,
        [roleId, mod.id],
      );
    }
    this.logger.debug('super_admin module access ensured.');
  }

  private async ensureBootstrapUser(superAdminRoleId: string) {
    const email = this.config.get<string>('BOOTSTRAP_ADMIN_EMAIL');
    if (!email) {
      this.logger.debug('BOOTSTRAP_ADMIN_EMAIL not set — skipping bootstrap user creation.');
      return;
    }

    const supabaseUrl = this.config.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      this.logger.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — skipping bootstrap user creation.');
      return;
    }

    const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const normalized = email.trim().toLowerCase();
    const name = this.config.get<string>('BOOTSTRAP_ADMIN_NAME') || 'System Admin';

    // 1. Ensure or create Supabase Auth user
    let supabaseAuthUserId: string;

    // Check if already in Supabase Auth
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      this.logger.warn(`Could not list Supabase Auth users: ${listError.message}`);
      return;
    }

    const existingAuthUser = listData.users.find(
      (u) => u.email?.toLowerCase() === normalized,
    );

    if (existingAuthUser) {
      supabaseAuthUserId = existingAuthUser.id;
      this.logger.debug(`Supabase Auth user already exists: ${email}`);
    } else {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalized,
        email_confirm: true, // pre-confirm for internal user
        password: 'Password123!',
        user_metadata: { full_name: name },
      });

      if (createError) {
        this.logger.warn(`Failed to create Supabase Auth user: ${createError.message}`);
        return;
      }

      supabaseAuthUserId = created.user.id;
      this.logger.log(`Supabase Auth bootstrap user created: ${email}`);
    }

    // 2. Ensure ATS user record
    const existing = await this.pool.query(
      `SELECT id FROM users WHERE email_normalized = $1 LIMIT 1`,
      [normalized],
    );

    let userId: string;
    if (existing.rows[0]) {
      userId = existing.rows[0].id;
      this.logger.debug(`ATS user already exists (${email}).`);
      // Ensure supabase_auth_user_id is linked
      await this.pool.query(
        `UPDATE users SET supabase_auth_user_id = $1 WHERE id = $2 AND supabase_auth_user_id IS NULL`,
        [supabaseAuthUserId, userId],
      );
    } else {
      const result = await this.pool.query(
        `INSERT INTO users (email, email_normalized, full_name, status, is_active, supabase_auth_user_id, org_id)
         VALUES ($1, $2, $3, 'active', true, $4, NULL)
         RETURNING id`,
        [normalized, normalized, name, supabaseAuthUserId],
      );
      userId = result.rows[0].id;
      this.logger.log(`ATS bootstrap user created: ${email}`);

      await this.auditService.log({
        entityType: 'user',
        entityId: userId,
        action: 'bootstrap_user_created',
        afterJson: { email, name },
      });
    }

    // 3. Ensure super_admin role assignment
    await this.pool.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, superAdminRoleId],
    );
    this.logger.debug('super_admin role assigned to bootstrap user.');
  }
}
