const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: 'postgresql://postgres.xowbipxwcqayslpueyxt:ca_dev_123456password@aws-1-ap-south-1.pooler.supabase.com:5432/postgres' 
});

async function run() {
  try {
    console.log('Inserting/updating MICROSOFT_TEAMS...');
    await pool.query(`
      INSERT INTO ca_interview_provider_configurations 
      (provider, display_name, auth_mode, config_json, encrypted_credentials_json, is_active)
      VALUES 
      ('MICROSOFT_TEAMS', 'Microsoft Teams', 'oauth2', '{}', '{}', true)
      ON CONFLICT (provider) DO UPDATE SET is_active = true
    `);
    console.log('Done!');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
