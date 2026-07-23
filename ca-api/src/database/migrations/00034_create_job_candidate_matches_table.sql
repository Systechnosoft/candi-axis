-- 00034_create_job_candidate_matches_table.sql
CREATE TABLE IF NOT EXISTS job_candidate_matches (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  rating double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz NULL,
  last_processed_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_jcm_jd FOREIGN KEY (job_id) REFERENCES job_descriptions(id) ON DELETE CASCADE,
  CONSTRAINT fk_jcm_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT uq_jcm_job_candidate UNIQUE (job_id, candidate_id)
);

CREATE UNIQUE INDEX idx_jcm_job_candidate_uq ON job_candidate_matches(job_id, candidate_id);
CREATE INDEX idx_jcm_job ON job_candidate_matches(job_id);
CREATE INDEX idx_jcm_candidate ON job_candidate_matches(candidate_id);
CREATE INDEX idx_jcm_created_at ON job_candidate_matches(created_at);
CREATE INDEX idx_jcm_is_active ON job_candidate_matches(is_active);
CREATE INDEX idx_jcm_deleted_at ON job_candidate_matches(deleted_at);

CREATE TRIGGER trig_job_candidate_matches_updated_at
BEFORE UPDATE ON job_candidate_matches
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_job_candidate_matches_org_id ON job_candidate_matches(org_id);
