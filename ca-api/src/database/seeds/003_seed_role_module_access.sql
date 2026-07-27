-- 003_seed_role_module_access.sql
-- Call the stored procedure to seed role permissions for all platform roles

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, code FROM public.ca_roles WHERE org_id IS NULL AND deleted_at IS NULL
  LOOP
    CALL public.seed_role_permissions(r.id, r.code);
  END LOOP;
END;
$$;
