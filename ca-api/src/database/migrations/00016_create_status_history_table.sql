-- 00016_create_status_history_table.sql
CREATE TABLE IF NOT EXISTS status_history (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type varchar(50) NOT NULL,
  entity_id uuid NOT NULL,
  from_status varchar(50) NULL,
  to_status varchar(50) NOT NULL,
  reason text NULL,
  changed_by uuid NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_status_history_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_status_history_entity_not_empty CHECK (trim(entity_type) <> ''),
  CONSTRAINT chk_status_history_to_not_empty CHECK (trim(to_status) <> '')
);

CREATE INDEX idx_status_history_entity_time ON status_history(entity_type, entity_id, changed_at DESC);
CREATE INDEX idx_status_history_changed_by ON status_history(changed_by);
CREATE INDEX idx_status_history_to_status ON status_history(to_status);

-- Note: Immutable, append-only history tracker. No hooks or soft-deletes apply here.

CREATE INDEX idx_status_history_org_id ON status_history(org_id);
