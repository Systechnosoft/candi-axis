const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:ca_dev_123456password@db.xowbipxwcqayslpueyxt.supabase.co:5432/postgres' });
pool.query("SELECT id, full_name, status, is_deleted FROM ca_candidates WHERE email ILIKE '%anujdhiman%'").then(r => { console.log(JSON.stringify(r.rows, null, 2)); process.exit(0); }).catch(console.error);
