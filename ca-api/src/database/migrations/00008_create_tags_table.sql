-- 00008_create_tags_table.sql

CREATE TABLE IF NOT EXISTS tags (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(150) NOT NULL,
  normalized_name varchar(150) NOT NULL,
  type varchar(50) NOT NULL,
  description text NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  deleted_at timestamptz NULL,
  is_deleted boolean NOT NULL DEFAULT false,

  CONSTRAINT fk_tags_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_tags_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT uq_tags_normalized_type UNIQUE (normalized_name, type),
  CONSTRAINT chk_tags_type CHECK (type IN ('skill', 'domain', 'level', 'location', 'other'))
);

CREATE UNIQUE INDEX idx_tags_normalized_type ON tags(normalized_name, type);
CREATE INDEX idx_tags_type ON tags(type);
CREATE INDEX idx_tags_active ON tags(active);
CREATE INDEX idx_tags_deleted_at ON tags(deleted_at);
CREATE INDEX idx_tags_is_deleted ON tags(is_deleted);

CREATE TRIGGER trig_tags_updated_at
BEFORE UPDATE ON tags
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_tags_org_id ON tags(org_id);
