import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkTables() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();

    const expectedCaTables = [
      'ca_user_roles',
      'ca_users',
      'ca_user_meeting_integrations',
      'ca_user_calendar_integrations',
      'ca_tasks',
      'ca_tags',
      'ca_status_history',
      'ca_roles',
      'ca_role_permissions',
      'ca_organisations',
      'ca_offers',
      'ca_notifications',
      'ca_notes',
      'ca_modules',
      'ca_job_requisitions',
      'ca_job_postings',
      'ca_job_descriptions',
      'ca_job_candidate_matches',
      'ca_interviews',
      'ca_interview_provider_configurations',
      'ca_interview_assignments',
      'ca_feedback_tasks',
      'ca_feedback_submissions',
      'ca_entity_tags',
      'ca_duplicate_matches',
      'ca_documents',
      'ca_contacts',
      'ca_candidates',
      'ca_candidate_social_links',
      'ca_candidate_projects',
      'ca_candidate_job_stages',
      'ca_candidate_employments',
      'ca_candidate_educations',
      'ca_candidate_certifications',
      'ca_audit_logs',
      'ca_admin_settings',
      'ca_addresses',
    ];

    let renamed = 0;
    let missing = 0;
    let required = 0;
    let collision = 0;

    for (const caTable of expectedCaTables) {
      const original = caTable.substring(3);

      const caExistsRes = await client.query(
        'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)',
        ['public', caTable],
      );
      const caExists = caExistsRes.rows[0].exists;

      const origExistsRes = await client.query(
        'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)',
        ['public', original],
      );
      const origExists = origExistsRes.rows[0].exists;

      if (caExists && !origExists) {
        renamed++;
      } else if (!caExists && origExists) {
        required++;
        console.log(`RENAME REQUIRED: ${original} -> ${caTable}`);
      } else if (caExists && origExists) {
        collision++;
        console.log(`COLLISION: Both ${original} and ${caTable} exist!`);
      } else {
        missing++;
        console.log(`BOTH MISSING: Neither ${original} nor ${caTable} exists!`);
      }
    }

    console.log(`\nExpected results:`);
    console.log(`${renamed} RENAMED`);
    console.log(`${required} RENAME REQUIRED`);
    console.log(`${collision} COLLISION - INVESTIGATE`);
    console.log(`${missing} BOTH MISSING - BLOCKED`);

    const countRes = await client.query(`
      SELECT COUNT(*) AS prefixed_table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'ca_%'
    `);

    console.log(
      `\nSELECT COUNT(*) AS prefixed_table_count: ${countRes.rows[0].prefixed_table_count}`,
    );
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkTables();
