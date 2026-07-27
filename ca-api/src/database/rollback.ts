import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const ALLOW_TEST_DB_ROLLBACK = process.env.ALLOW_TEST_DB_ROLLBACK === 'true';
const NODE_ENV = process.env.NODE_ENV || 'development';

async function runRollback() {
  console.log('--- Starting Custom Validation Rollback ---');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();

    const dbRes = await client.query(
      'SELECT current_database() as db, current_user as usr, current_schema() as sch',
    );
    const { db, usr, sch } = dbRes.rows[0];

    console.log(`Database Host: (from connection string)`);
    console.log(`Database Name: ${db}`);
    console.log(`Schema: ${sch}`);
    console.log(`Database User: ${usr}`);
    console.log(`NODE_ENV: ${NODE_ENV}`);

    if (NODE_ENV === 'production' || db.toLowerCase().includes('prod')) {
      console.error('Refusing to run in production environment.');
      process.exit(1);
    }

    if (!ALLOW_TEST_DB_ROLLBACK) {
      console.error('ALLOW_TEST_DB_ROLLBACK=true is not set. Refusing to run.');
      process.exit(1);
    }

    // Define 37 table mappings by batch in descending order
    const batches = [
      {
        id: '00058_rename_batch_8_tables.sql',
        tables: [
          { ca: 'ca_user_roles', original: 'user_roles' },
          { ca: 'ca_users', original: 'users' },
        ],
      },
      {
        id: '00057_rename_batch_7_tables.sql',
        tables: [
          {
            ca: 'ca_user_meeting_integrations',
            original: 'user_meeting_integrations',
          },
          {
            ca: 'ca_user_calendar_integrations',
            original: 'user_calendar_integrations',
          },
          { ca: 'ca_tasks', original: 'tasks' },
          { ca: 'ca_tags', original: 'tags' },
          { ca: 'ca_status_history', original: 'status_history' },
        ],
      },
      {
        id: '00056_rename_batch_6_tables.sql',
        tables: [
          { ca: 'ca_roles', original: 'roles' },
          { ca: 'ca_role_permissions', original: 'role_permissions' },
          { ca: 'ca_organisations', original: 'organisations' },
          { ca: 'ca_offers', original: 'offers' },
          { ca: 'ca_notifications', original: 'notifications' },
        ],
      },
      {
        id: '00055_rename_batch_5_tables.sql',
        tables: [
          { ca: 'ca_notes', original: 'notes' },
          { ca: 'ca_modules', original: 'modules' },
          { ca: 'ca_job_requisitions', original: 'job_requisitions' },
          { ca: 'ca_job_postings', original: 'job_postings' },
          { ca: 'ca_job_descriptions', original: 'job_descriptions' },
        ],
      },
      {
        id: '00054_rename_batch_4_tables.sql',
        tables: [
          { ca: 'ca_job_candidate_matches', original: 'job_candidate_matches' },
          { ca: 'ca_interviews', original: 'interviews' },
          {
            ca: 'ca_interview_provider_configurations',
            original: 'interview_provider_configurations',
          },
          { ca: 'ca_interview_assignments', original: 'interview_assignments' },
          { ca: 'ca_feedback_tasks', original: 'feedback_tasks' },
        ],
      },
      {
        id: '00053_rename_batch_3_tables.sql',
        tables: [
          { ca: 'ca_feedback_submissions', original: 'feedback_submissions' },
          { ca: 'ca_entity_tags', original: 'entity_tags' },
          { ca: 'ca_duplicate_matches', original: 'duplicate_matches' },
          { ca: 'ca_documents', original: 'documents' },
          { ca: 'ca_contacts', original: 'contacts' },
        ],
      },
      {
        id: '00052_rename_batch_2_tables.sql',
        tables: [
          { ca: 'ca_candidates', original: 'candidates' },
          {
            ca: 'ca_candidate_social_links',
            original: 'candidate_social_links',
          },
          { ca: 'ca_candidate_projects', original: 'candidate_projects' },
          { ca: 'ca_candidate_job_stages', original: 'candidate_job_stages' },
          { ca: 'ca_candidate_employments', original: 'candidate_employments' },
        ],
      },
      {
        id: '00051_rename_batch_1_tables.sql',
        tables: [
          { ca: 'ca_candidate_educations', original: 'candidate_educations' },
          {
            ca: 'ca_candidate_certifications',
            original: 'candidate_certifications',
          },
          { ca: 'ca_audit_logs', original: 'audit_logs' },
          { ca: 'ca_admin_settings', original: 'admin_settings' },
          { ca: 'ca_addresses', original: 'addresses' },
        ],
      },
    ];

    // Pre-checks
    let missingSource = false;
    let collisionTarget = false;

    for (const batch of batches) {
      for (const t of batch.tables) {
        // Check source ca_ table exists
        const existsCaRes = await client.query(
          'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1)',
          [t.ca],
        );
        if (!existsCaRes.rows[0].exists) {
          console.error(`Source table ${t.ca} does NOT exist.`);
          missingSource = true;
        }

        // Check target old table does not exist
        const existsOldRes = await client.query(
          'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1)',
          [t.original],
        );
        if (existsOldRes.rows[0].exists) {
          console.error(`Target original table ${t.original} ALREADY exists.`);
          collisionTarget = true;
        }
      }
    }

    if (missingSource || collisionTarget) {
      console.error(
        'Pre-checks failed. The schema might be partially migrated or not migrated at all.',
      );
      process.exit(1);
    }

    // Perform Rollback
    await client.query('BEGIN');

    try {
      for (const batch of batches) {
        console.log(`Reversing ${batch.id}...`);
        for (const t of batch.tables) {
          console.log(`  ALTER TABLE ${t.ca} RENAME TO ${t.original};`);
          await client.query(
            `ALTER TABLE IF EXISTS ${t.ca} RENAME TO ${t.original}`,
          );
        }

        // Remove tracking record
        await client.query(`DELETE FROM _migrations WHERE filename = $1`, [
          batch.id,
        ]);

        // Restore procedure for Batch 6
        if (batch.id === '00056_rename_batch_6_tables.sql') {
          console.log(`  Restoring seed_role_permissions procedure...`);
          await client.query(`
            CREATE OR REPLACE PROCEDURE public.seed_role_permissions(p_role_id UUID, p_role_code VARCHAR)
            LANGUAGE plpgsql
            AS $$
            DECLARE
              rec RECORD;
            BEGIN
              IF LOWER(p_role_code) = 'super_admin' THEN
                FOR rec IN SELECT id FROM public.modules LOOP
                  INSERT INTO public.role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete)
                  VALUES (p_role_id, rec.id, true, true, true, true)
                  ON CONFLICT (role_id, module_id) DO UPDATE
                  SET can_read = true, can_create = true, can_update = true, can_delete = true;
                END LOOP;
              ELSIF LOWER(p_role_code) = 'admin' THEN
                FOR rec IN SELECT id, code FROM public.modules LOOP
                  IF rec.code <> 'organisations' THEN
                    INSERT INTO public.role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete)
                    VALUES (p_role_id, rec.id, true, true, true, true)
                    ON CONFLICT (role_id, module_id) DO UPDATE
                    SET can_read = true, can_create = true, can_update = true, can_delete = true;
                  END IF;
                END LOOP;
              ELSIF LOWER(p_role_code) = 'hr_recruiter' OR LOWER(p_role_code) = 'recruiter' THEN
                FOR rec IN SELECT id, code FROM public.modules LOOP
                  IF rec.code IN ('dashboard', 'requisitions', 'job_descriptions', 'candidates', 'interviews', 'feedback', 'offers', 'documents', 'tags', 'notifications', 'applications', 'job_postings') THEN
                    INSERT INTO public.role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete)
                    VALUES (p_role_id, rec.id, true, true, true, false)
                    ON CONFLICT (role_id, module_id) DO UPDATE
                    SET can_read = true, can_create = true, can_update = true, can_delete = false;
                  ELSIF rec.code IN ('users', 'roles', 'audit_logs') THEN
                    INSERT INTO public.role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete)
                    VALUES (p_role_id, rec.id, true, false, false, false)
                    ON CONFLICT (role_id, module_id) DO UPDATE
                    SET can_read = true, can_create = false, can_update = false, can_delete = false;
                  END IF;
                END LOOP;
              ELSIF LOWER(p_role_code) = 'hiring_manager' THEN
                FOR rec IN SELECT id, code FROM public.modules LOOP
                  IF rec.code IN ('dashboard', 'requisitions', 'job_descriptions', 'candidates', 'interviews', 'feedback', 'documents') THEN
                    INSERT INTO public.role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete)
                    VALUES (p_role_id, rec.id, true, false, false, false)
                    ON CONFLICT (role_id, module_id) DO UPDATE
                    SET can_read = true, can_create = false, can_update = false, can_delete = false;
                  END IF;
                END LOOP;
              END IF;
            END;
            $$;
           `);
        }
      }

      await client.query('COMMIT');
      console.log('--- Rollback Successful ---');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('--- Rollback Failed. Transaction Rolled Back. ---', err);
      throw err;
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runRollback();
