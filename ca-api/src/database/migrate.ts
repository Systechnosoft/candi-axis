import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

let migrationsDir = path.join(process.cwd(), 'src/database/migrations');
if (!fs.existsSync(migrationsDir)) {
  migrationsDir = path.join(process.cwd(), 'dist/database/migrations');
}

async function runMigrations() {
  console.log('--- Starting MVP Migrations ---');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    // Ensure migration tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename varchar(255) PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Check if this is an existing legacy database by looking for the users table
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ca_users'
      )
    `);
    const dbAlreadyHasSchema = checkTable.rows[0].exists;

    const appliedResult = await client.query(
      `SELECT filename FROM _migrations`,
    );
    const applied = new Set<string>(
      appliedResult.rows.map((r: { filename: string }) => {
        const match = r.filename.match(/\d{5}_.*\.sql$/);
        return match ? match[0] : r.filename;
      })
    );

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql') && !file.endsWith('.down.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      const match = file.match(/\d{5}_.*\.sql$/);
      const strippedFilename = match ? match[0] : file;
      if (applied.has(strippedFilename) || applied.has(file)) {
        console.log(`  -> Already applied, skipping: ${file}`);
        continue;
      }

      // Fast-forward consolidated MVP migrations on existing databases
      if (dbAlreadyHasSchema && file.startsWith('28072026_') && file < '28072026_00050') {
        console.log(`  -> Legacy DB detected, automatically marking MVP migration as applied: ${file}`);
        await client.query(`INSERT INTO _migrations (filename) VALUES ($1)`, [file]);
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
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
