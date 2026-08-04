import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

let seedsDir = path.join(process.cwd(), 'src/database/seeds');
if (!fs.existsSync(seedsDir)) {
  seedsDir = path.join(process.cwd(), 'dist/database/seeds');
}

async function runSeeds() {
  console.log('--- Starting MVP Seeds ---');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    const files = fs
      .readdirSync(seedsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`Executing seed: ${file}...`);
      const filePath = path.join(seedsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`  -> Success: ${file}`);
      } catch (fileErr) {
        await client.query('ROLLBACK');
        console.error(`  -> Failed: ${file}`, fileErr);
        throw fileErr;
      }
    }

    console.log('--- All Seeds Complete ---');
  } catch (err) {
    console.error('Seed running failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSeeds();
