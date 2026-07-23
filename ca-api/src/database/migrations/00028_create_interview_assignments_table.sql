-- 00028_create_interview_assignments_table.sql
CREATE TABLE IF NOT EXISTS interview_assignments (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL,
  interviewer_user_id uuid NOT NULL,
  required_feedback boolean NOT NULL DEFAULT true,
  assignment_status varchar(30) NOT NULL DEFAULT 'invited',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_assignment_interview FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignment_interviewer FOREIGN KEY (interviewer_user_id) REFERENCES users(id) ON DELETE RESTRICT,

  CONSTRAINT uq_assignment_interview_user UNIQUE (interview_id, interviewer_user_id),
  CONSTRAINT chk_assignment_status CHECK (assignment_status IN ('invited', 'accepted', 'declined'))
);

CREATE UNIQUE INDEX idx_assignment_interview_user_uq ON interview_assignments(interview_id, interviewer_user_id);
CREATE INDEX idx_assignment_interviewer ON interview_assignments(interviewer_user_id);
CREATE INDEX idx_assignment_status ON interview_assignments(assignment_status);

CREATE TRIGGER trig_assignments_updated_at
BEFORE UPDATE ON interview_assignments
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_interview_assignments_org_id ON interview_assignments(org_id);
