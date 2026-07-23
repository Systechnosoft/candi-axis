import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim();
  const normalized = email.toLowerCase();
  const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  
  const client = new Client({ connectionString: process.env.DATABASE_URL! });
  await client.connect();

  const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
  const existingAuthUser = listData.users.find(u => u.email?.toLowerCase() === normalized);
  if (!existingAuthUser) {
    console.log("No supabase user");
    process.exit(1);
  }
  
  const authId = existingAuthUser.id;
  console.log("Found Supabase Auth ID:", authId);

  // force update the ats database!
  await client.query(
    `UPDATE users SET supabase_auth_user_id = $1, is_active=true, status='active', is_deleted=false WHERE email_normalized = $2`,
    [authId, normalized]
  );
  
  console.log("Forced update of supabase auth ID in ATS db to", authId);

  const res = await client.query('SELECT supabase_auth_user_id, status, is_active FROM users WHERE email_normalized = $1', [normalized]);
  console.log("Current user state in db:", res.rows[0]);

  process.exit(0);
}
run();
