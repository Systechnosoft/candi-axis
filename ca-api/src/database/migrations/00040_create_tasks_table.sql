-- 00040_create_tasks_table.sql
CREATE TABLE IF NOT EXISTS tasks (
  org_id uuid NOT NULL ,
  task_id SERIAL PRIMARY KEY,
  name varchar(255) NOT NULL,
  assignee uuid[] NOT NULL DEFAULT '{}',
  assigned_on timestamptz NOT NULL DEFAULT now(),
  jd_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  application_id uuid NOT NULL,
  jobposting_id uuid NOT NULL,
  submitted_on timestamptz NULL,
  is_active boolean NOT NULL DEFAULT true,
  status varchar(30) NOT NULL DEFAULT 'new',
  submitted_by uuid NULL,
  feedback_action varchar(30) NULL,
  feedback_reason text NULL,
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  task_code varchar(30) UNIQUE,
  feedback_submission_id uuid REFERENCES feedback_submissions(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_tasks_jd FOREIGN KEY (jd_id) REFERENCES job_descriptions(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_jobposting FOREIGN KEY (jobposting_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_tasks_jd_id ON tasks(jd_id);
CREATE INDEX idx_tasks_candidate_id ON tasks(candidate_id);
CREATE INDEX idx_tasks_application_id ON tasks(application_id);
CREATE INDEX idx_tasks_jobposting_id ON tasks(jobposting_id);
CREATE INDEX idx_tasks_is_active ON tasks(is_active);
CREATE INDEX idx_tasks_status ON tasks(status);

CREATE TRIGGER trig_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_tasks_org_id ON tasks(org_id);
