-- 00005_create_modules_table.sql

CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(100) NOT NULL,
  name varchar(150) NOT NULL,
  description text NULL,
  module_group varchar(100) NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_platform_only boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_modules_code UNIQUE (code),
  CONSTRAINT uq_modules_name UNIQUE (name)
);

CREATE UNIQUE INDEX idx_modules_code ON modules(code);
CREATE UNIQUE INDEX idx_modules_name ON modules(name);
CREATE INDEX idx_modules_group ON modules(module_group);
CREATE INDEX idx_modules_active ON modules(is_active);

CREATE TRIGGER trig_modules_updated_at
BEFORE UPDATE ON modules
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();
