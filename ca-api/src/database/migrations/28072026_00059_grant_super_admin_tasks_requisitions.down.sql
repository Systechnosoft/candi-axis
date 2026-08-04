-- 28072026_00059_grant_super_admin_tasks_requisitions.down.sql
-- Deletes exactly the rows created in the up migration

BEGIN;

DO $$
DECLARE
    v_role_id uuid;
    v_feedback_mod_id uuid;
    v_req_mod_id uuid;
BEGIN
    SELECT id INTO v_role_id FROM public.ca_roles WHERE code = 'super_admin' AND is_active = true AND deleted_at IS NULL LIMIT 1;
    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Active super_admin role not found';
    END IF;

    SELECT id INTO v_feedback_mod_id FROM public.ca_modules WHERE code = 'feedback' AND is_active = true AND is_platform_only = false LIMIT 1;
    SELECT id INTO v_req_mod_id FROM public.ca_modules WHERE code = 'requisitions' AND is_active = true AND is_platform_only = false LIMIT 1;

    DELETE FROM public.ca_role_permissions 
    WHERE role_id = v_role_id AND module_id IN (v_feedback_mod_id, v_req_mod_id);

END $$;

COMMIT;
