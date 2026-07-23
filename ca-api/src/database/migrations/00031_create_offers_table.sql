-- 00031_create_offers_table.sql
CREATE TABLE IF NOT EXISTS offers (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  offered_ctc numeric(12,2) NOT NULL,
  joining_date date NULL,
  offer_valid_till date NULL,
  status varchar(30) NOT NULL DEFAULT 'draft',
  notes text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  is_deleted boolean NOT NULL DEFAULT false,

  CONSTRAINT fk_offers_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_offers_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT uq_offers_application UNIQUE (application_id),
  CONSTRAINT chk_offers_ctc CHECK (offered_ctc >= 0),
  CONSTRAINT chk_offers_status CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'withdrawn'))
);

CREATE UNIQUE INDEX idx_offers_application_uq ON offers(application_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_joining ON offers(joining_date);
CREATE INDEX idx_offers_valid_till ON offers(offer_valid_till);
CREATE INDEX idx_offers_created_by ON offers(created_by);
CREATE INDEX idx_offers_created_at ON offers(created_at);
CREATE INDEX idx_offers_deleted_at ON offers(deleted_at);
CREATE INDEX idx_offers_is_deleted ON offers(is_deleted);

CREATE TRIGGER trig_offers_updated_at
BEFORE UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_offers_org_id ON offers(org_id);
