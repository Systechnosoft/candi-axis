-- 00029_create_feedback_tasks_table.sql
CREATE TABLE IF NOT EXISTS feedback_tasks (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL,
  interviewer_user_id uuid NOT NULL,
  due_at timestamptz NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'open',
  reminders_sent_count integer NOT NULL DEFAULT 0,
  last_reminder_at timestamptz NULL,
  submitted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_feedback_task_interview FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
  CONSTRAINT fk_feedback_task_interviewer FOREIGN KEY (interviewer_user_id) REFERENCES users(id) ON DELETE RESTRICT,

  CONSTRAINT uq_feedback_task_interview_user UNIQUE (interview_id, interviewer_user_id),

  CONSTRAINT chk_feedback_task_reminders CHECK (reminders_sent_count >= 0),
  CONSTRAINT chk_feedback_task_status CHECK (status IN ('open', 'submitted', 'overdue'))
);

CREATE UNIQUE INDEX idx_feedback_task_interview_user_uq ON feedback_tasks(interview_id, interviewer_user_id);
CREATE INDEX idx_feedback_task_due ON feedback_tasks(due_at);
CREATE INDEX idx_feedback_task_status ON feedback_tasks(status);
CREATE INDEX idx_feedback_task_user ON feedback_tasks(interviewer_user_id);

CREATE INDEX idx_feedback_task_status_due ON feedback_tasks(status, due_at);
CREATE INDEX idx_feedback_task_user_status ON feedback_tasks(interviewer_user_id, status);

CREATE TRIGGER trig_feedback_tasks_updated_at
BEFORE UPDATE ON feedback_tasks
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_feedback_tasks_org_id ON feedback_tasks(org_id);
