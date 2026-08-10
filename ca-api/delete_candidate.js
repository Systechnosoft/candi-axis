const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:ca_dev_123456password@db.xowbipxwcqayslpueyxt.supabase.co:5432/postgres'
});

async function deleteCandidate() {
  try {
    const res = await pool.query("DELETE FROM ca_candidates WHERE id = '29f5c731-24ae-43c8-8eb0-10c1ab5f81de'");
    console.log(`Deleted ${res.rowCount} candidate(s).`);
  } catch (err) {
    console.error('Error deleting candidate:', err);
  } finally {
    await pool.end();
  }
}

deleteCandidate();
