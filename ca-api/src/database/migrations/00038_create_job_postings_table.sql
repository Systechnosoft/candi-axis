CREATE SEQUENCE IF NOT EXISTS job_posting_code_seq START WITH 1;

CREATE TABLE IF NOT EXISTS job_postings (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(50) NOT NULL DEFAULT 'JP-' || lpad(nextval('job_posting_code_seq')::text, 3, '0'),
  name varchar(255) NOT NULL,
  description text NULL,
  jd_id uuid NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  hr_ids uuid[] NULL DEFAULT '{}',
  interviewer_ids uuid[] NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL,

  CONSTRAINT fk_job_postings_jd FOREIGN KEY (jd_id) REFERENCES job_descriptions(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_postings_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_job_postings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_job_postings_jd_id ON job_postings(jd_id);
CREATE INDEX idx_job_postings_is_active ON job_postings(is_active);

CREATE TRIGGER trig_job_postings_updated_at
BEFORE UPDATE ON job_postings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trig_protect_job_postings_code
BEFORE UPDATE ON job_postings
FOR EACH ROW
EXECUTE FUNCTION protect_code_column();

CREATE INDEX idx_job_postings_org_id ON job_postings(org_id);
