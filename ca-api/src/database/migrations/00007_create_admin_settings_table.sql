-- 00007_create_admin_settings_table.sql

CREATE TABLE IF NOT EXISTS admin_settings (
  org_id uuid NULL,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key varchar(100) NOT NULL,
  setting_value jsonb NOT NULL,
  value_type varchar(30) NOT NULL DEFAULT 'json',
  description text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL,

  CONSTRAINT fk_admin_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT uq_admin_settings_key UNIQUE (setting_key),
  CONSTRAINT chk_admin_settings_value_type CHECK (value_type IN ('string', 'number', 'boolean', 'json'))
);

CREATE UNIQUE INDEX idx_admin_settings_key ON admin_settings(setting_key);
CREATE INDEX idx_admin_settings_active ON admin_settings(is_active);

CREATE TRIGGER trig_admin_settings_updated_at
BEFORE UPDATE ON admin_settings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_admin_settings_org_id ON admin_settings(org_id);
