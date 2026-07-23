-- 00020_create_candidate_educations_table.sql
CREATE TABLE IF NOT EXISTS candidate_educations (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  qualification_level varchar(50) NULL,
  degree varchar(150) NULL,
  field_of_study varchar(150) NULL,
  institution_name varchar(255) NULL,
  start_year integer NULL,
  end_year integer NULL,
  grade_or_percentage varchar(50) NULL,
  is_highest boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  deleted_at timestamptz NULL,
  is_deleted boolean NOT NULL DEFAULT false,

  CONSTRAINT fk_cand_educations_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_cand_educations_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_cand_educations_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT chk_cand_educations_years CHECK (start_year IS NULL OR end_year IS NULL OR end_year >= start_year),
  CONSTRAINT chk_cand_educations_level CHECK (qualification_level IS NULL OR qualification_level IN ('secondary', 'higher_secondary', 'diploma', 'bachelor', 'master', 'doctorate', 'other'))
);

-- Partial unique ensuring only one "is_highest" record exists per candidate natively
CREATE UNIQUE INDEX uq_cand_educations_highest ON candidate_educations(candidate_id) WHERE is_highest = true;

CREATE INDEX idx_cand_educations_cand ON candidate_educations(candidate_id);
CREATE INDEX idx_cand_educations_cand_highest ON candidate_educations(candidate_id, is_highest);
CREATE INDEX idx_cand_educations_cand_sort ON candidate_educations(candidate_id, sort_order);
CREATE INDEX idx_cand_educations_deleted ON candidate_educations(deleted_at);
CREATE INDEX idx_cand_educations_is_deleted ON candidate_educations(is_deleted);

CREATE TRIGGER trig_cand_educations_updated_at
BEFORE UPDATE ON candidate_educations
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_candidate_educations_org_id ON candidate_educations(org_id);
