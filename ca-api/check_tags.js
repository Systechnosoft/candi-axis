const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:ca_dev_123456password@db.xowbipxwcqayslpueyxt.supabase.co:5432/postgres' });

async function run() {
  const query = `
    SELECT 
        t.name as "Tag Name", 
        t.type as "Tag Type", 
        t.active as "Is Active", 
        t.is_deleted as "Is Deleted"
    FROM ca_entity_tags et
    JOIN ca_tags t ON t.id = et.tag_id
    JOIN ca_candidates c ON c.id = et.entity_id
    WHERE et.entity_type = 'candidate' 
      AND c.email ILIKE '%anujdhiman%';
  `;
  
  try {
    const res = await pool.query(query);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
