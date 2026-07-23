-- 00011_create_contacts_table.sql
CREATE TABLE IF NOT EXISTS contacts (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type varchar(50) NOT NULL,
  entity_id uuid NOT NULL,
  contact_type varchar(50) NOT NULL,
  contact_value varchar(320) NOT NULL,
  contact_value_normalized varchar(320) NULL,
  country_code varchar(10) NULL,
  label varchar(100) NULL,
  is_primary boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,

  CONSTRAINT fk_contacts_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_contacts_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_contacts_type CHECK (contact_type IN ('phone', 'email', 'whatsapp')),
  CONSTRAINT chk_contacts_type_not_empty CHECK (trim(contact_type) <> ''),
  CONSTRAINT chk_contacts_value_not_empty CHECK (trim(contact_value) <> '')
);

CREATE INDEX idx_contacts_entity ON contacts(entity_type, entity_id);
CREATE INDEX idx_contacts_entity_type ON contacts(entity_type, entity_id, contact_type);
CREATE INDEX idx_contacts_value_normalized ON contacts(contact_value_normalized);
CREATE INDEX idx_contacts_is_deleted ON contacts(is_deleted);
CREATE INDEX idx_contacts_deleted_at ON contacts(deleted_at);

CREATE TRIGGER trig_contacts_updated_at
BEFORE UPDATE ON contacts
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_contacts_org_id ON contacts(org_id);
