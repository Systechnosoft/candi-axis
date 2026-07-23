-- 00035_create_candidate_projects_table.sql
CREATE TABLE IF NOT EXISTS candidate_projects (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  title varchar(255) NOT NULL,
  description text NULL,
  technologies varchar(500) NULL,
  duration varchar(150) NULL,
  role varchar(255) NULL,
  project_url varchar(500) NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  deleted_at timestamptz NULL,
  is_deleted boolean NOT NULL DEFAULT false,

  CONSTRAINT fk_cand_projects_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_cand_projects_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_cand_projects_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT chk_cand_projects_title_not_empty CHECK (trim(title) <> '')
);

CREATE INDEX idx_cand_projects_cand ON candidate_projects(candidate_id);
CREATE INDEX idx_cand_projects_title ON candidate_projects(title);
CREATE INDEX idx_cand_projects_deleted ON candidate_projects(deleted_at);
CREATE INDEX idx_cand_projects_is_deleted ON candidate_projects(is_deleted);

CREATE TRIGGER trig_cand_projects_updated_at
BEFORE UPDATE ON candidate_projects
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_candidate_projects_org_id ON candidate_projects(org_id);
