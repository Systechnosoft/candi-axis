const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:ca_dev_123456password@db.xowbipxwcqayslpueyxt.supabase.co:5432/postgres' });

async function run() {
  const q = `
      SELECT 
        c.full_name,
        COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.type = 'skill' AND t.is_deleted = false AND t.active = true), '{}') as skills
      FROM ca_candidates c
      LEFT JOIN ca_entity_tags et_all ON et_all.entity_type = 'candidate' AND et_all.entity_id = c.id
      LEFT JOIN ca_tags t ON t.id = et_all.tag_id
      WHERE c.email ILIKE '%anujdhiman%'
      GROUP BY c.id
  `;
  const res = await pool.query(q);
  console.log("Candidate skills array:", res.rows[0].skills);
  process.exit(0);
}
run();
