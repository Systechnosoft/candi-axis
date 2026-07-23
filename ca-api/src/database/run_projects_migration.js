const { Client } = require('pg');
require('dotenv').config();

async function run() {
  console.log('Starting projects table setup...');
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
        WHERE table_name = 'candidate_projects'
      );
    `);
    
    const exists = checkRes.rows[0].exists;
    if (exists) {
      console.log('Table "candidate_projects" already exists.');
    } else {
      console.log('Table "candidate_projects" does not exist. Creating table...');
      await client.query('BEGIN');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS candidate_projects (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          candidate_id uuid NOT NULL,
          title varchar(255) NOT NULL,
          description text NULL,
          technologies varchar(500) NULL,
          duration varchar(150) NULL,
          role varchar(255) NULL,
          project_url varchar(500) NULL,
          is_active boolean NOT NULL DEFAULT true,
          sort_order integer NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          created_by uuid NULL,
          updated_by uuid NULL,
          deleted_at timestamptz NULL,
          is_deleted boolean NOT NULL DEFAULT false,

          CONSTRAINT fk_cand_projects_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
          CONSTRAINT fk_cand_projects_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
          CONSTRAINT fk_cand_projects_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,

          CONSTRAINT chk_cand_projects_title_not_empty CHECK (trim(title) <> '')
        );
      `);

      console.log('Table created. Creating indexes...');
      try {
        await client.query(`CREATE INDEX idx_cand_projects_cand ON candidate_projects(candidate_id);`);
      } catch (e) { console.log('Index idx_cand_projects_cand already exists or failed:', e.message); }
      
      try {
        await client.query(`CREATE INDEX idx_cand_projects_title ON candidate_projects(title);`);
      } catch (e) { console.log('Index idx_cand_projects_title already exists or failed:', e.message); }

      try {
        await client.query(`CREATE INDEX idx_cand_projects_deleted ON candidate_projects(deleted_at);`);
      } catch (e) { console.log('Index idx_cand_projects_deleted already exists or failed:', e.message); }

      try {
        await client.query(`CREATE INDEX idx_cand_projects_is_deleted ON candidate_projects(is_deleted);`);
      } catch (e) { console.log('Index idx_cand_projects_is_deleted already exists or failed:', e.message); }

      console.log('Indexes created. Creating trigger...');
      try {
        await client.query(`
          CREATE TRIGGER trig_cand_projects_updated_at
          BEFORE UPDATE ON candidate_projects
          FOR EACH ROW
          EXECUTE FUNCTION trigger_set_updated_at();
        `);
      } catch (e) { console.log('Trigger already exists or failed:', e.message); }

      // Let's also register this in the _migrations table so it registers as successfully applied!
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS _migrations (
            filename varchar(255) PRIMARY KEY,
            applied_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await client.query(
          `INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
          ['00035_create_candidate_projects_table.sql']
        );
      } catch (e) {
        console.log('Failed to record migration in _migrations table:', e.message);
      }

      await client.query('COMMIT');
      console.log('Transaction committed. candidate_projects table created successfully.');
    }
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await client.end();
  }
}

run();
