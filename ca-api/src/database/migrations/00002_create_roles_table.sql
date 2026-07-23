-- 00002_create_roles_table.sql

CREATE TABLE IF NOT EXISTS roles (
  org_id uuid NULL,
  scope varchar(30) NOT NULL DEFAULT 'CUSTOMER',
  role_type varchar(50) NOT NULL DEFAULT 'CUSTOM',
  level integer NOT NULL DEFAULT 10,
  is_system_role boolean NOT NULL DEFAULT false,
  is_editable boolean NOT NULL DEFAULT true,
  deleted_at timestamptz NULL,
  created_by uuid NULL,
  updated_by uuid NULL,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(50) NOT NULL,
  name varchar(100) NOT NULL,
  description text NULL,
  is_system boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_roles_code_not_empty CHECK (trim(code) <> ''),
  CONSTRAINT chk_roles_name_not_empty CHECK (trim(name) <> '')
);

CREATE UNIQUE INDEX idx_roles_code_platform ON roles(code) WHERE org_id IS NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_roles_code_org ON roles(org_id, code) WHERE org_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_roles_name_platform ON roles(name) WHERE org_id IS NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_roles_name_org ON roles(org_id, name) WHERE org_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_roles_is_active ON roles(is_active);

CREATE TRIGGER trig_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();
