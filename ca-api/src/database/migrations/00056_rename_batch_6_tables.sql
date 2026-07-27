-- Up Migration
ALTER TABLE IF EXISTS notifications RENAME TO ca_notifications;
ALTER TABLE IF EXISTS offers RENAME TO ca_offers;
ALTER TABLE IF EXISTS organisations RENAME TO ca_organisations;
ALTER TABLE IF EXISTS role_permissions RENAME TO ca_role_permissions;
ALTER TABLE IF EXISTS roles RENAME TO ca_roles;

-- Redefine the procedure to use ca_ tables
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

-- Down Migration
ALTER TABLE IF EXISTS ca_notifications RENAME TO notifications;
ALTER TABLE IF EXISTS ca_offers RENAME TO offers;
ALTER TABLE IF EXISTS ca_organisations RENAME TO organisations;
ALTER TABLE IF EXISTS ca_role_permissions RENAME TO role_permissions;
ALTER TABLE IF EXISTS ca_roles RENAME TO roles;

-- Restore procedure for down migration
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
