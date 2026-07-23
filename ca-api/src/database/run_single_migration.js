const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    // Check if table exists
    const checkRes = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'job_candidate_matches'
      );
    `);
    
    const exists = checkRes.rows[0].exists;
    if (exists) {
      console.log('Table "job_candidate_matches" already exists.');
    } else {
      console.log('Table "job_candidate_matches" does not exist. Creating table...');
      await client.query('BEGIN');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS job_candidate_matches (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          job_id uuid NOT NULL,
          candidate_id uuid NOT NULL,
          rating double precision NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          is_active boolean NOT NULL DEFAULT true,
          deleted_at timestamptz NULL,
          last_processed_at timestamptz NOT NULL DEFAULT now(),

          CONSTRAINT fk_jcm_jd FOREIGN KEY (job_id) REFERENCES job_descriptions(id) ON DELETE CASCADE,
          CONSTRAINT fk_jcm_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
          CONSTRAINT uq_jcm_job_candidate UNIQUE (job_id, candidate_id)
        );
      `);

      console.log('Table created. Creating indexes...');
      try {
        await client.query(`CREATE UNIQUE INDEX idx_jcm_job_candidate_uq ON job_candidate_matches(job_id, candidate_id);`);
      } catch (e) { console.log('Index idx_jcm_job_candidate_uq already exists or failed:', e.message); }
      
      try {
        await client.query(`CREATE INDEX idx_jcm_job ON job_candidate_matches(job_id);`);
      } catch (e) { console.log('Index idx_jcm_job already exists or failed:', e.message); }

      try {
        await client.query(`CREATE INDEX idx_jcm_candidate ON job_candidate_matches(candidate_id);`);
      } catch (e) { console.log('Index idx_jcm_candidate already exists or failed:', e.message); }

      try {
        await client.query(`CREATE INDEX idx_jcm_created_at ON job_candidate_matches(created_at);`);
      } catch (e) { console.log('Index idx_jcm_created_at already exists or failed:', e.message); }

      try {
        await client.query(`CREATE INDEX idx_jcm_is_active ON job_candidate_matches(is_active);`);
      } catch (e) { console.log('Index idx_jcm_is_active already exists or failed:', e.message); }

      try {
        await client.query(`CREATE INDEX idx_jcm_deleted_at ON job_candidate_matches(deleted_at);`);
      } catch (e) { console.log('Index idx_jcm_deleted_at already exists or failed:', e.message); }

      console.log('Indexes created. Creating trigger...');
      try {
        await client.query(`
          CREATE TRIGGER trig_job_candidate_matches_updated_at
          BEFORE UPDATE ON job_candidate_matches
          FOR EACH ROW
          EXECUTE FUNCTION trigger_set_updated_at();
        `);
      } catch (e) { console.log('Trigger already exists or failed:', e.message); }

      await client.query('COMMIT');
      console.log('Transaction committed. Table created successfully.');
    }
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await client.end();
  }
}

run();
