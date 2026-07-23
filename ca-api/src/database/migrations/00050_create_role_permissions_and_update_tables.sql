-- 00050_create_role_permissions_and_update_tables.sql
-- 1. Alter roles table columns
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS scope VARCHAR(30) NOT NULL DEFAULT 'CUSTOMER';
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS role_type VARCHAR(50) NOT NULL DEFAULT 'CUSTOM';
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 10;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS is_system_role BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS is_editable BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;



-- 3. Add role_id relation to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;

-- 4. Seed ATS Modules
DELETE FROM public.modules;
INSERT INTO public.modules (code, name, description, module_group, sort_order, is_platform_only, is_system)
VALUES
  ('dashboard', 'Dashboard', 'Primary overview and metrics', 'core', 10, false, true),
  ('organisations', 'Organisations', 'Platform organisation management', 'admin', 20, true, true),
  ('users', 'Users', 'System user management', 'admin', 30, false, true),
  ('roles', 'Roles', 'Roles and module permissions management', 'admin', 40, false, true),
  ('requisitions', 'Requisitions', 'Job opening management', 'recruiting', 50, false, true),
  ('job_descriptions', 'Job Descriptions', 'Role requirement management', 'recruiting', 60, false, true),
  ('job_postings', 'Job Postings', 'Job postings management', 'recruiting', 65, false, true),
  ('candidates', 'Candidates', 'Global candidate pool', 'recruiting', 70, false, true),
  ('applications', 'Applications', 'Candidate applications tracking', 'recruiting', 75, false, true),
  ('documents', 'Documents', 'Candidate and offer files', 'recruiting', 80, false, true),
  ('duplicate_matches', 'Duplicate Matches', 'Duplicate resolution workflow', 'recruiting', 90, false, true),
  ('interviews', 'Interviews', 'Interview scheduling and tracking', 'evaluation', 120, false, true),
  ('feedback', 'Feedback', 'Interview feedback submission', 'evaluation', 130, false, true),
  ('offers', 'Offers', 'Offer lifecycle management', 'closure', 140, false, true),
  ('audit_logs', 'Audit Logs', 'System-wide activity history', 'system', 150, false, true),
  ('reports', 'Reports', 'Analytics and data exports', 'system', 160, false, true),
  ('admin', 'Admin Config', 'Global configuration settings', 'admin', 170, false, true),
  ('tags', 'Tags', 'System tag dictionary management', 'admin', 180, false, true)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      module_group = EXCLUDED.module_group,
      sort_order = EXCLUDED.sort_order,
      is_platform_only = EXCLUDED.is_platform_only,
      is_system = EXCLUDED.is_system;

-- 5. Seeding logic for standard roles and platform roles
CREATE OR REPLACE PROCEDURE public.seed_role_permissions(p_role_id UUID, p_role_code VARCHAR)
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Normalize to lowercase for safe matching
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