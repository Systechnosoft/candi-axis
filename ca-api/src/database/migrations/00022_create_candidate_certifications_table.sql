-- 00022_create_candidate_certifications_table.sql
CREATE TABLE IF NOT EXISTS candidate_certifications (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  certification_name varchar(255) NOT NULL,
  issuer varchar(255) NULL,
  issued_on date NULL,
  expiry_on date NULL,
  does_not_expire boolean NOT NULL DEFAULT false,
  credential_id varchar(150) NULL,
  credential_url varchar(500) NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  deleted_at timestamptz NULL,
  is_deleted boolean NOT NULL DEFAULT false,

  CONSTRAINT fk_cand_certs_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_cand_certs_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_cand_certs_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT chk_cand_certs_name_not_empty CHECK (trim(certification_name) <> ''),
  CONSTRAINT chk_cand_certs_dates CHECK (issued_on IS NULL OR expiry_on IS NULL OR expiry_on >= issued_on)
);

CREATE INDEX idx_cand_certs_cand ON candidate_certifications(candidate_id);
CREATE INDEX idx_cand_certs_name ON candidate_certifications(certification_name);
CREATE INDEX idx_cand_certs_issuer ON candidate_certifications(issuer);
CREATE INDEX idx_cand_certs_does_not_expire ON candidate_certifications(does_not_expire);
CREATE INDEX idx_cand_certs_deleted ON candidate_certifications(deleted_at);
CREATE INDEX idx_cand_certs_is_deleted ON candidate_certifications(is_deleted);

CREATE TRIGGER trig_cand_certs_updated_at
BEFORE UPDATE ON candidate_certifications
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_candidate_certifications_org_id ON candidate_certifications(org_id);
