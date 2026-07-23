-- 00025_create_applications_table.sql
CREATE TABLE IF NOT EXISTS applications (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  jd_id uuid NOT NULL,
  source varchar(50) NOT NULL DEFAULT 'manual',
  stage varchar(30) NOT NULL DEFAULT 'new',
  stage_reason text NULL,
  stage_updated_at timestamptz NOT NULL DEFAULT now(),
  stage_updated_by uuid NULL,
  expected_ctc_snapshot numeric(12,2) NULL,
  revised_expected_ctc_snapshot numeric(12,2) NULL,
  offered_ctc numeric(12,2) NULL,
  joining_date date NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  is_deleted boolean NOT NULL DEFAULT false,

  CONSTRAINT fk_app_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_jd FOREIGN KEY (jd_id) REFERENCES job_descriptions(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_stage_by FOREIGN KEY (stage_updated_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_app_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT uq_app_candidate_jd UNIQUE (candidate_id, jd_id),

  CONSTRAINT chk_app_stage CHECK (stage IN ('new', 'screening', 'interviewing', 'shortlisted', 'offered', 'accepted', 'rejected', 'joined', 'closed')),
  CONSTRAINT chk_app_source CHECK (source IN ('manual', 'resume_upload', 'referral', 'agency', 'other')),
  CONSTRAINT chk_app_exp_ctc CHECK (expected_ctc_snapshot IS NULL OR expected_ctc_snapshot >= 0),
  CONSTRAINT chk_app_rev_ctc CHECK (revised_expected_ctc_snapshot IS NULL OR revised_expected_ctc_snapshot >= 0),
  CONSTRAINT chk_app_off_ctc CHECK (offered_ctc IS NULL OR offered_ctc >= 0)
);

CREATE UNIQUE INDEX idx_app_candidate_jd_uq ON applications(candidate_id, jd_id);
CREATE INDEX idx_app_candidate ON applications(candidate_id);
CREATE INDEX idx_app_jd ON applications(jd_id);
CREATE INDEX idx_app_stage ON applications(stage);
CREATE INDEX idx_app_stage_updated_at ON applications(stage_updated_at);
CREATE INDEX idx_app_stage_updated_by ON applications(stage_updated_by);
CREATE INDEX idx_app_created_at ON applications(created_at);
CREATE INDEX idx_app_deleted_at ON applications(deleted_at);
CREATE INDEX idx_app_is_deleted ON applications(is_deleted);

CREATE INDEX idx_app_composite_jd_stage ON applications(jd_id, stage);
CREATE INDEX idx_app_composite_cand_stage ON applications(candidate_id, stage);

CREATE TRIGGER trig_applications_updated_at
BEFORE UPDATE ON applications
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_applications_org_id ON applications(org_id);
