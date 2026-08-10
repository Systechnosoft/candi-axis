const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: 'postgresql://postgres:ca_dev_123456password@db.xowbipxwcqayslpueyxt.supabase.co:5432/postgres'
});

async function main() {
  try {
    const res = await pool.query('SELECT id, name FROM ca_tags WHERE name ILIKE \'%Machine Learning%\' OR name ILIKE \'%Python%\'');
    fs.writeFileSync('db_out.txt', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    fs.writeFileSync('db_out.txt', 'ERROR: ' + err.message);
  } finally {
    await pool.end();
  }
}

main();
