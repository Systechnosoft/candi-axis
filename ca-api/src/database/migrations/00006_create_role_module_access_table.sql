-- 00006_create_role_module_access_table.sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  can_read BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_update BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_role_module_permissions UNIQUE(role_id, module_id)
);

CREATE UNIQUE INDEX idx_rp_role_module ON role_permissions(role_id, module_id);

CREATE TRIGGER trig_role_permissions_updated_at
BEFORE UPDATE ON role_permissions
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();