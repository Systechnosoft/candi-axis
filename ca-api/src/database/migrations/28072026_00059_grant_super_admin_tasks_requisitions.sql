-- 28072026_00059_grant_super_admin_tasks_requisitions.sql
-- Idempotent insert-only migration to grant super_admin explicitly to feedback and requisitions

BEGIN;

DO $$
DECLARE
    v_role_id uuid;
    v_feedback_mod_id uuid;
    v_req_mod_id uuid;
    v_count int;
BEGIN
    -- 1. Precondition: Exactly 1 active super_admin role exists
    SELECT id INTO v_role_id FROM public.ca_roles WHERE code = 'super_admin' AND is_active = true AND deleted_at IS NULL LIMIT 1;
    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Active super_admin role not found';
    END IF;

    -- 2. Precondition: The modules exist, are active, and non-platform
    SELECT id INTO v_feedback_mod_id FROM public.ca_modules WHERE code = 'feedback' AND is_active = true AND is_platform_only = false LIMIT 1;
    IF v_feedback_mod_id IS NULL THEN
        RAISE EXCEPTION 'Active non-platform feedback module not found';
    END IF;

    SELECT id INTO v_req_mod_id FROM public.ca_modules WHERE code = 'requisitions' AND is_active = true AND is_platform_only = false LIMIT 1;
    IF v_req_mod_id IS NULL THEN
        RAISE EXCEPTION 'Active non-platform requisitions module not found';
    END IF;

    -- 3. Safe Insert for feedback
    SELECT count(*) INTO v_count FROM public.ca_role_permissions 
    WHERE role_id = v_role_id AND module_id = v_feedback_mod_id;
    
    IF v_count = 0 THEN
        INSERT INTO public.ca_role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete, created_at, updated_at)
        VALUES (v_role_id, v_feedback_mod_id, true, true, true, true, NOW(), NOW());
    END IF;

    -- 4. Safe Insert for requisitions
    SELECT count(*) INTO v_count FROM public.ca_role_permissions 
    WHERE role_id = v_role_id AND module_id = v_req_mod_id;
    
    IF v_count = 0 THEN
        INSERT INTO public.ca_role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete, created_at, updated_at)
        VALUES (v_role_id, v_req_mod_id, true, true, true, true, NOW(), NOW());
    END IF;

END $$;

COMMIT;
