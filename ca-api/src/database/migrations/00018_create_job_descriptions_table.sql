CREATE SEQUENCE IF NOT EXISTS job_description_code_seq START WITH 1;

CREATE TABLE IF NOT EXISTS job_descriptions (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id uuid NOT NULL,
  title varchar(200) NOT NULL,
  code varchar(50) NOT NULL DEFAULT 'JD-' || lpad(nextval('job_description_code_seq')::text, 3, '0'),
  location varchar(150) NULL,
  work_mode varchar(30) NULL,
  employment_type varchar(30) NULL,
  exp_min_months integer NULL,
  exp_max_months integer NULL,
  must_have_text text NULL,
  nice_to_have_text text NULL,
  job_summary text NULL,
  responsibilities_text text NULL,
  status varchar(30) NOT NULL DEFAULT 'draft',
  owner_user_id uuid NULL,
  published_internal_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  deleted_at timestamptz NULL,
  is_deleted boolean NOT NULL DEFAULT false,

  CONSTRAINT fk_jd_requisition FOREIGN KEY (requisition_id) REFERENCES job_requisitions(id) ON DELETE CASCADE,
  CONSTRAINT fk_jd_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_jd_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_jd_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT chk_jd_exp_range CHECK (exp_min_months IS NULL OR exp_max_months IS NULL OR exp_max_months >= exp_min_months),
  CONSTRAINT chk_jd_status CHECK (status IN ('draft', 'open', 'on_hold', 'closed')),
  CONSTRAINT chk_jd_work_mode CHECK (work_mode IS NULL OR work_mode IN ('onsite', 'remote', 'hybrid')),
  CONSTRAINT chk_jd_employment_type CHECK (employment_type IS NULL OR employment_type IN ('full_time', 'part_time', 'contract', 'internship'))
);

CREATE INDEX idx_jd_req_id ON job_descriptions(requisition_id);
CREATE INDEX idx_jd_status ON job_descriptions(status);
CREATE INDEX idx_jd_loc ON job_descriptions(location);
CREATE INDEX idx_jd_work_mode ON job_descriptions(work_mode);
CREATE INDEX idx_jd_emp_type ON job_descriptions(employment_type);
CREATE INDEX idx_jd_owner ON job_descriptions(owner_user_id);
CREATE INDEX idx_jd_deleted ON job_descriptions(deleted_at);
CREATE INDEX idx_jd_is_deleted ON job_descriptions(is_deleted);

CREATE INDEX idx_jd_composite_status_type ON job_descriptions(status, work_mode, employment_type);
CREATE INDEX idx_jd_composite_req_status ON job_descriptions(requisition_id, status);

-- GIN FTS indexes for AI matching text blocks
CREATE INDEX idx_jd_must_have_gin ON job_descriptions USING GIN (to_tsvector('english', must_have_text));
CREATE INDEX idx_jd_nice_have_gin ON job_descriptions USING GIN (to_tsvector('english', nice_to_have_text));
CREATE INDEX idx_jd_summary_gin ON job_descriptions USING GIN (to_tsvector('english', job_summary));

CREATE TRIGGER trig_jd_updated_at
BEFORE UPDATE ON job_descriptions
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trig_protect_job_descriptions_code
BEFORE UPDATE ON job_descriptions
FOR EACH ROW
EXECUTE FUNCTION protect_code_column();

CREATE INDEX idx_job_descriptions_org_id ON job_descriptions(org_id);
