/**
 * env-check.ts — Validates required environment variables before startup.
 */

import * as dotenv from 'dotenv';
dotenv.config();

const REQUIRED = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_JWT_SECRET'];

let allOk = true;

for (const key of REQUIRED) {
  const val = (process.env[key] || '').trim();
  if (!val) {
    console.error(`[env-check] MISSING required env var: ${key}`);
    allOk = false;
  }
}

if (!allOk) {
  console.error('[env-check] Environment validation FAILED. Check your .env file.');
  process.exit(1);
}

const bootstrapEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim();
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (bootstrapEmail && !serviceRoleKey) {
  console.warn('[env-check] WARNING: BOOTSTRAP_ADMIN_EMAIL is set but SUPABASE_SERVICE_ROLE_KEY is missing. Bootstrap admin will be skipped.');
}

console.log('[env-check] Environment OK.');
