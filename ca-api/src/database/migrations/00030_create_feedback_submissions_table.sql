-- 00030_create_feedback_submissions_table.sql
CREATE TABLE IF NOT EXISTS feedback_submissions (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_task_id uuid NOT NULL,
  interview_id uuid NOT NULL,
  interviewer_user_id uuid NOT NULL,
  tech_rating numeric(4,2) NULL,
  comms_rating numeric(4,2) NULL,
  problem_solving_rating numeric(4,2) NULL,
  culture_fit_rating numeric(4,2) NULL,
  overall_rating numeric(4,2) NULL,
  recommendation varchar(30) NOT NULL,
  strengths text NULL,
  risks text NULL,
  notes text NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_feedback_sub_task FOREIGN KEY (feedback_task_id) REFERENCES feedback_tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_feedback_sub_interview FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
  CONSTRAINT fk_feedback_sub_interviewer FOREIGN KEY (interviewer_user_id) REFERENCES users(id) ON DELETE RESTRICT,

  CONSTRAINT uq_feedback_sub_task UNIQUE (feedback_task_id),

  CONSTRAINT chk_feedback_sub_recommendation CHECK (recommendation IN ('strong_yes', 'yes', 'maybe', 'no', 'strong_no')),

  -- Ratings strictly restricted between 0.00 and 5.00 globally
  CONSTRAINT chk_feedback_sub_tech_rating CHECK (tech_rating IS NULL OR (tech_rating >= 0 AND tech_rating <= 5)),
  CONSTRAINT chk_feedback_sub_comms_rating CHECK (comms_rating IS NULL OR (comms_rating >= 0 AND comms_rating <= 5)),
  CONSTRAINT chk_feedback_sub_ps_rating CHECK (problem_solving_rating IS NULL OR (problem_solving_rating >= 0 AND problem_solving_rating <= 5)),
  CONSTRAINT chk_feedback_sub_culture_rating CHECK (culture_fit_rating IS NULL OR (culture_fit_rating >= 0 AND culture_fit_rating <= 5)),
  CONSTRAINT chk_feedback_sub_overall_rating CHECK (overall_rating IS NULL OR (overall_rating >= 0 AND overall_rating <= 5))
);

CREATE UNIQUE INDEX idx_feedback_sub_task_uq ON feedback_submissions(feedback_task_id);
CREATE INDEX idx_feedback_sub_interview ON feedback_submissions(interview_id);
CREATE INDEX idx_feedback_sub_user ON feedback_submissions(interviewer_user_id);
CREATE INDEX idx_feedback_sub_submitted ON feedback_submissions(submitted_at);
CREATE INDEX idx_feedback_sub_recommendation ON feedback_submissions(recommendation);

CREATE TRIGGER trig_feedback_subs_updated_at
BEFORE UPDATE ON feedback_submissions
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_feedback_submissions_org_id ON feedback_submissions(org_id);
