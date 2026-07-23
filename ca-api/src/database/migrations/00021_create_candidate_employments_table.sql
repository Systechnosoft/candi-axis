-- 00021_create_candidate_employments_table.sql
CREATE TABLE IF NOT EXISTS candidate_employments (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  company_name varchar(255) NOT NULL,
  job_title varchar(150) NULL,
  employment_type varchar(50) NULL,
  location varchar(150) NULL,
  start_date date NULL,
  end_date date NULL,
  is_current boolean NOT NULL DEFAULT false,
  duration_months integer NULL,
  responsibilities_summary text NULL,
  technologies_used text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  deleted_at timestamptz NULL,
  is_deleted boolean NOT NULL DEFAULT false,

  CONSTRAINT fk_cand_employments_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_cand_employments_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_cand_employments_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT chk_cand_employments_company_not_empty CHECK (trim(company_name) <> ''),
  CONSTRAINT chk_cand_employments_dates CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date),
  CONSTRAINT chk_cand_employments_type CHECK (employment_type IS NULL OR employment_type IN ('full_time', 'part_time', 'contract', 'internship', 'freelance', 'other'))
);

-- Partial unique ensuring only one "is_current=true" record exists natively per candidate.
CREATE UNIQUE INDEX uq_cand_employments_current ON candidate_employments(candidate_id) WHERE is_current = true;

CREATE INDEX idx_cand_employments_cand ON candidate_employments(candidate_id);
CREATE INDEX idx_cand_employments_cand_current ON candidate_employments(candidate_id, is_current);
CREATE INDEX idx_cand_employments_cand_sort ON candidate_employments(candidate_id, sort_order);
CREATE INDEX idx_cand_employments_company ON candidate_employments(company_name);
CREATE INDEX idx_cand_employments_deleted ON candidate_employments(deleted_at);
CREATE INDEX idx_cand_employments_is_deleted ON candidate_employments(is_deleted);

CREATE TRIGGER trig_cand_employments_updated_at
BEFORE UPDATE ON candidate_employments
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_candidate_employments_org_id ON candidate_employments(org_id);
