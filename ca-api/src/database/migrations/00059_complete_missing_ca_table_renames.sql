-- 00059_complete_missing_ca_table_renames.sql
-- Up Migration

-- Batch 1
ALTER TABLE IF EXISTS addresses RENAME TO ca_addresses;
ALTER TABLE IF EXISTS admin_settings RENAME TO ca_admin_settings;
ALTER TABLE IF EXISTS audit_logs RENAME TO ca_audit_logs;
ALTER TABLE IF EXISTS candidate_certifications RENAME TO ca_candidate_certifications;
ALTER TABLE IF EXISTS candidate_educations RENAME TO ca_candidate_educations;

-- Batch 2
ALTER TABLE IF EXISTS candidate_employments RENAME TO ca_candidate_employments;
ALTER TABLE IF EXISTS candidate_job_stages RENAME TO ca_candidate_job_stages;
ALTER TABLE IF EXISTS candidate_projects RENAME TO ca_candidate_projects;
ALTER TABLE IF EXISTS candidate_social_links RENAME TO ca_candidate_social_links;
ALTER TABLE IF EXISTS candidates RENAME TO ca_candidates;

-- Batch 3
ALTER TABLE IF EXISTS contacts RENAME TO ca_contacts;
ALTER TABLE IF EXISTS documents RENAME TO ca_documents;
ALTER TABLE IF EXISTS duplicate_matches RENAME TO ca_duplicate_matches;
ALTER TABLE IF EXISTS entity_tags RENAME TO ca_entity_tags;
ALTER TABLE IF EXISTS feedback_submissions RENAME TO ca_feedback_submissions;

-- Batch 4
ALTER TABLE IF EXISTS feedback_tasks RENAME TO ca_feedback_tasks;
ALTER TABLE IF EXISTS interview_assignments RENAME TO ca_interview_assignments;
ALTER TABLE IF EXISTS interview_provider_configurations RENAME TO ca_interview_provider_configurations;
ALTER TABLE IF EXISTS interviews RENAME TO ca_interviews;
ALTER TABLE IF EXISTS job_candidate_matches RENAME TO ca_job_candidate_matches;

-- Batch 5
ALTER TABLE IF EXISTS job_descriptions RENAME TO ca_job_descriptions;
ALTER TABLE IF EXISTS job_postings RENAME TO ca_job_postings;
ALTER TABLE IF EXISTS job_requisitions RENAME TO ca_job_requisitions;
ALTER TABLE IF EXISTS modules RENAME TO ca_modules;
ALTER TABLE IF EXISTS notes RENAME TO ca_notes;

-- Batch 6
ALTER TABLE IF EXISTS notifications RENAME TO ca_notifications;
ALTER TABLE IF EXISTS offers RENAME TO ca_offers;
ALTER TABLE IF EXISTS organisations RENAME TO ca_organisations;
ALTER TABLE IF EXISTS role_permissions RENAME TO ca_role_permissions;
ALTER TABLE IF EXISTS roles RENAME TO ca_roles;

-- Batch 7
ALTER TABLE IF EXISTS status_history RENAME TO ca_status_history;
ALTER TABLE IF EXISTS tags RENAME TO ca_tags;
ALTER TABLE IF EXISTS tasks RENAME TO ca_tasks;
ALTER TABLE IF EXISTS user_calendar_integrations RENAME TO ca_user_calendar_integrations;
ALTER TABLE IF EXISTS user_meeting_integrations RENAME TO ca_user_meeting_integrations;

-- Batch 8
ALTER TABLE IF EXISTS user_roles RENAME TO ca_user_roles;
ALTER TABLE IF EXISTS users RENAME TO ca_users;


-- Redefine the procedure to use ca_ tables (correction from Batch 6)
CREATE OR REPLACE PROCEDURE public.seed_role_permissions(p_role_id UUID, p_role_code VARCHAR)
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Normalize to lowercase for safe matching
  IF LOWER(p_role_code) = 'super_admin' THEN
    FOR rec IN SELECT id FROM public.ca_modules LOOP
      INSERT INTO public.ca_role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete)
      VALUES (p_role_id, rec.id, true, true, true, true)
      ON CONFLICT (role_id, module_id) DO UPDATE
      SET can_read = true, can_create = true, can_update = true, can_delete = true;
    END LOOP;
  ELSIF LOWER(p_role_code) = 'admin' THEN
    FOR rec IN SELECT id, code FROM public.ca_modules LOOP
      IF rec.code <> 'organisations' THEN
        INSERT INTO public.ca_role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete)
        VALUES (p_role_id, rec.id, true, true, true, true)
        ON CONFLICT (role_id, module_id) DO UPDATE
        SET can_read = true, can_create = true, can_update = true, can_delete = true;
      END IF;
    END LOOP;
  ELSIF LOWER(p_role_code) = 'hr_recruiter' OR LOWER(p_role_code) = 'recruiter' THEN
    FOR rec IN SELECT id, code FROM public.ca_modules LOOP
      IF rec.code IN ('dashboard', 'requisitions', 'job_descriptions', 'candidates', 'interviews', 'feedback', 'offers', 'documents', 'tags', 'notifications', 'applications', 'job_postings') THEN
        INSERT INTO public.ca_role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete)
        VALUES (p_role_id, rec.id, true, true, true, false)
        ON CONFLICT (role_id, module_id) DO UPDATE
        SET can_read = true, can_create = true, can_update = true, can_delete = false;
      ELSIF rec.code IN ('users', 'roles', 'audit_logs') THEN
        INSERT INTO public.ca_role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete)
        VALUES (p_role_id, rec.id, true, false, false, false)
        ON CONFLICT (role_id, module_id) DO UPDATE
        SET can_read = true, can_create = false, can_update = false, can_delete = false;
      END IF;
    END LOOP;
  ELSIF LOWER(p_role_code) = 'hiring_manager' THEN
    FOR rec IN SELECT id, code FROM public.ca_modules LOOP
      IF rec.code IN ('dashboard', 'requisitions', 'job_descriptions', 'candidates', 'interviews', 'feedback', 'documents') THEN
        INSERT INTO public.ca_role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete)
        VALUES (p_role_id, rec.id, true, false, false, false)
        ON CONFLICT (role_id, module_id) DO UPDATE
        SET can_read = true, can_create = false, can_update = false, can_delete = false;
      END IF;
    END LOOP;
  END IF;
END;
$$;
