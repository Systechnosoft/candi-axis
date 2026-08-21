const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:ca_dev_123456password@db.xowbipxwcqayslpueyxt.supabase.co:5432/postgres'
});
async function run() {
  const res = await pool.query("SELECT setting_key, setting_value FROM ca_admin_settings WHERE setting_key LIKE '%ai_parsing_model_%'");
  console.log(res.rows);
  await pool.end();
}
run();
