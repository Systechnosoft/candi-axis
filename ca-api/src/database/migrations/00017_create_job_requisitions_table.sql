CREATE SEQUENCE IF NOT EXISTS job_requisition_code_seq START WITH 1;

CREATE TABLE IF NOT EXISTS job_requisitions (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(50) NOT NULL DEFAULT 'REQ-' || lpad(nextval('job_requisition_code_seq')::text, 3, '0'),
  title varchar(200) NOT NULL,
  department varchar(100) NOT NULL,
  openings_count integer NOT NULL DEFAULT 1,
  priority varchar(30) NOT NULL DEFAULT 'medium',
  hiring_manager_id uuid NOT NULL,
  owner_user_id uuid NULL,
  status varchar(30) NOT NULL DEFAULT 'draft',
  status_reason text NULL,
  opened_at timestamptz NULL,
  closed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  deleted_at timestamptz NULL,
  is_deleted boolean NOT NULL DEFAULT false,

  CONSTRAINT fk_job_req_hm FOREIGN KEY (hiring_manager_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_job_req_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_job_req_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_job_req_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT uq_job_req_code UNIQUE (code),
  CONSTRAINT chk_job_req_openings CHECK (openings_count > 0),
  CONSTRAINT chk_job_req_status CHECK (status IN ('draft', 'open', 'on_hold', 'closed')),
  CONSTRAINT chk_job_req_priority CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

CREATE UNIQUE INDEX idx_job_req_code ON job_requisitions(code);
CREATE INDEX idx_job_req_dept ON job_requisitions(department);
CREATE INDEX idx_job_req_hm ON job_requisitions(hiring_manager_id);
CREATE INDEX idx_job_req_owner ON job_requisitions(owner_user_id);
CREATE INDEX idx_job_req_status ON job_requisitions(status);
CREATE INDEX idx_job_req_priority ON job_requisitions(priority);
CREATE INDEX idx_job_req_deleted ON job_requisitions(deleted_at);
CREATE INDEX idx_job_req_is_deleted ON job_requisitions(is_deleted);

CREATE INDEX idx_job_req_status_priority ON job_requisitions(status, priority);
CREATE INDEX idx_job_req_dept_status ON job_requisitions(department, status);

CREATE TRIGGER trig_job_req_updated_at
BEFORE UPDATE ON job_requisitions
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trig_protect_job_requisitions_code
BEFORE UPDATE ON job_requisitions
FOR EACH ROW
EXECUTE FUNCTION protect_code_column();

CREATE INDEX idx_job_requisitions_org_id ON job_requisitions(org_id);
