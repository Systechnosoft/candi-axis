-- 00010_create_addresses_table.sql
CREATE TABLE IF NOT EXISTS addresses (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type varchar(50) NOT NULL,
  entity_id uuid NOT NULL,
  address_type varchar(50) NOT NULL,
  line1 varchar(255) NOT NULL,
  line2 varchar(255) NULL,
  landmark varchar(255) NULL,
  city varchar(100) NULL,
  state varchar(100) NULL,
  country varchar(100) NULL,
  postal_code varchar(20) NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,

  CONSTRAINT fk_addresses_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_addresses_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_addresses_entity ON addresses(entity_type, entity_id);
CREATE INDEX idx_addresses_entity_type ON addresses(entity_type, entity_id, address_type);
CREATE INDEX idx_addresses_is_deleted ON addresses(is_deleted);
CREATE INDEX idx_addresses_deleted_at ON addresses(deleted_at);

CREATE TRIGGER trig_addresses_updated_at
BEFORE UPDATE ON addresses
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_addresses_org_id ON addresses(org_id);
