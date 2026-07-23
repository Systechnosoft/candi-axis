const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const migrationsDir = path.join(__dirname, 'migrations');

async function runMigrations() {
  console.log('--- Starting plain JS migrations run ---');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database successfully.');

    // Ensure migration tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename varchar(255) PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const appliedResult = await client.query(
      `SELECT filename FROM _migrations`
    );
    const applied = new Set(
      appliedResult.rows.map((r) => r.filename)
    );

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  -> Already applied, skipping: ${file}`);
        continue;
      }

      console.log(`Executing migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(`INSERT INTO _migrations (filename) VALUES ($1)`, [
          file,
        ]);
        await client.query('COMMIT');
        console.log(`  -> Success: ${file}`);
        count++;
      } catch (fileErr) {
        await client.query('ROLLBACK');
        console.error(`  -> Failed: ${file}`, fileErr);
        throw fileErr;
      }
    }

    if (count === 0) {
      console.log('All migrations already applied — nothing to run.');
    } else {
      console.log(`--- ${count} Migration(s) Applied ---`);
    }
  } catch (err) {
    console.error('Migration running failed:', err);
  } finally {
    await client.end();
  }
}

runMigrations();
