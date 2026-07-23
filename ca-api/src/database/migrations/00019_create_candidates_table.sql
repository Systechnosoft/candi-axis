-- 00019_create_candidates_table.sql
CREATE TABLE IF NOT EXISTS candidates (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(200) NOT NULL,
  first_name varchar(100) NULL,
  last_name varchar(100) NULL,
  email varchar(320) NULL,
  email_normalized varchar(320) NULL,
  email_verified boolean NOT NULL DEFAULT false,
  phone varchar(30) NULL,
  phone_normalized varchar(30) NULL,
  phone_verified boolean NOT NULL DEFAULT false,
  location varchar(150) NULL,
  total_exp_months integer NULL,
  relevant_exp_months integer NULL,
  current_company varchar(150) NULL,
  current_designation varchar(150) NULL,
  notice_period_days integer NULL,
  current_ctc numeric(12,2) NULL,
  expected_ctc numeric(12,2) NULL,
  revised_expected_ctc numeric(12,2) NULL,
  secondary_email varchar(320) NULL,
  secondary_phone varchar(30) NULL,
  education_summary varchar(255) NULL,
  profile_summary text NULL,
  source varchar(50) NULL,
  status varchar(30) NOT NULL DEFAULT 'active',
  last_resume_uploaded_at timestamptz NULL,
  profile_score integer DEFAULT NULL,
  gap_details jsonb DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  deleted_at timestamptz NULL,
  is_deleted boolean NOT NULL DEFAULT false,

  CONSTRAINT fk_candidates_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_candidates_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT chk_candidates_status CHECK (status IN ('active', 'archived', 'blacklisted', 'joined_elsewhere')),
  CONSTRAINT chk_candidates_source CHECK (source IS NULL OR source IN ('resume_upload', 'manual', 'referral', 'consultant', 'job_board', 'other')),
  CONSTRAINT chk_candidates_notice_period CHECK (notice_period_days IS NULL OR notice_period_days >= 0),
  CONSTRAINT chk_candidates_total_exp CHECK (total_exp_months IS NULL OR total_exp_months >= 0),
  CONSTRAINT chk_candidates_relevant_exp CHECK (relevant_exp_months IS NULL OR relevant_exp_months >= 0)
);

CREATE INDEX idx_candidates_email_norm ON candidates(email_normalized);
CREATE INDEX idx_candidates_phone_norm ON candidates(phone_normalized);
CREATE INDEX idx_candidates_location ON candidates(location);
CREATE INDEX idx_candidates_total_exp ON candidates(total_exp_months);
CREATE INDEX idx_candidates_relevant_exp ON candidates(relevant_exp_months);
CREATE INDEX idx_candidates_notice ON candidates(notice_period_days);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_updated_at ON candidates(updated_at);
CREATE INDEX idx_candidates_deleted_at ON candidates(deleted_at);
CREATE INDEX idx_candidates_is_deleted ON candidates(is_deleted);

CREATE INDEX idx_candidates_status_loc ON candidates(status, location);
CREATE INDEX idx_candidates_status_notice ON candidates(status, notice_period_days);
CREATE INDEX idx_candidates_status_exp ON candidates(status, total_exp_months);

-- Trigram Indexes for rapid fuzzy searching / duplicate detection
-- NOTE: pg_trgm extension must be active (Activated in Batch 1).
CREATE INDEX idx_candidates_name_trgm ON candidates USING GIN (full_name gin_trgm_ops);
CREATE INDEX idx_candidates_email_trgm ON candidates USING GIN (email_normalized gin_trgm_ops);
CREATE INDEX idx_candidates_phone_trgm ON candidates USING GIN (phone_normalized gin_trgm_ops);

-- FTS for AI Searchings
CREATE INDEX idx_candidates_summary_gin ON candidates USING GIN (to_tsvector('english', profile_summary));

CREATE TRIGGER trig_candidates_updated_at
BEFORE UPDATE ON candidates
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_candidates_org_id ON candidates(org_id);
