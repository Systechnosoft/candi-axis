import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function diagnose() {
  const dbUrl = process.env.DATABASE_URL || '';
  console.log('=== DATABASE DIAGNOSTICS ===');
  console.log('DATABASE_URL host segment:', dbUrl.split('@')[1]?.split('/')[0] || 'UNKNOWN');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    // Which database?
    const dbName = await client.query('SELECT current_database(), current_schema(), current_user');
    console.log('Connected DB:', dbName.rows[0]);

    // List all schemas that have a users table
    const schemas = await client.query(`
      SELECT table_schema, table_name, 
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = t.table_schema AND table_name = 'users') as col_count
      FROM information_schema.tables t
      WHERE table_name = 'users'
      ORDER BY table_schema
    `);
    console.log('Users tables found in schemas:', schemas.rows);

    // Check how many rows in the users table in public schema
    const count = await client.query('SELECT COUNT(*) FROM public.users');
    console.log('public.users row count:', count.rows[0].count);

    // Show all users
    const users = await client.query('SELECT id, email, email_normalized, is_active, status, is_deleted FROM public.users LIMIT 10');
    console.log('public.users rows:', users.rows);

    // Check search_path
    const sp = await client.query('SHOW search_path');
    console.log('search_path:', sp.rows[0]);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

diagnose();
