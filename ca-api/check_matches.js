const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:ca_dev_123456password@db.xowbipxwcqayslpueyxt.supabase.co:5432/postgres' });

async function run() {
  const res1 = await pool.query(`SELECT id FROM ca_job_descriptions WHERE code = 'JD-004' LIMIT 1`);
  if (!res1.rows[0]) {
    console.log("No JD-004 found");
    process.exit(1);
  }
  const jobId = res1.rows[0].id;
  
  const matchesRes = await pool.query(`SELECT candidate_id, rating FROM ca_job_candidate_matches WHERE job_id = $1`, [jobId]);
  console.log("Matches stored:", matchesRes.rows.length);

  const activeRes = await pool.query(`SELECT id, full_name, status FROM ca_candidates WHERE is_deleted = false`);
  console.log("Total candidates:", activeRes.rows.length);

  const query = `
      WITH candidate_matches AS (
        SELECT 
          c.id as candidate_id,
          c.full_name,
          COALESCE(c.current_designation, '') as past_role,
          c.current_ctc,
          c.expected_ctc,
          c.notice_period_days,
          1.0 as overlap_count,
          '{}'::text[] as skills
        FROM ca_candidates c
        WHERE c.status = 'active'
          AND c.is_deleted = false
          AND NOT EXISTS (
            SELECT 1 FROM public.ca_candidate_job_stages cjs
            JOIN public.ca_job_postings jp ON cjs.job_posting_id = jp.id
            WHERE cjs.candidate_id = c.id 
              AND jp.jd_id = $1 
              AND jp.is_deleted = false
              AND cjs.stage != 'rejected'
              AND cjs.deleted_at IS NULL
          )
      )
      SELECT 
        m.candidate_id,
        m.full_name,
        m.past_role,
        m.current_ctc,
        m.expected_ctc,
        m.notice_period_days,
        m.skills,
        0 as total_jd_tags,
        100.0 as similarity_score
      FROM candidate_matches m
  `;
  const detailRes = await pool.query(query, [jobId]);
  console.log("Detailed matches length:", detailRes.rows.length);
  process.exit(0);
}
run().catch(console.error);
