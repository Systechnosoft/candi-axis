-- 00015_create_audit_logs_table.sql
CREATE TABLE IF NOT EXISTS audit_logs (
  org_id uuid NULL,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type varchar(50) NOT NULL,
  entity_id varchar(100) NOT NULL,
  action varchar(50) NOT NULL,
  before_json jsonb NULL,
  after_json jsonb NULL,
  changed_by uuid NULL,
  reason_context text NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_audit_logs_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_audit_logs_entity_not_empty CHECK (trim(entity_type) <> ''),
  CONSTRAINT chk_audit_logs_action_not_empty CHECK (trim(action) <> '')
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_changed_by ON audit_logs(changed_by);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at DESC);

-- GIN indexing to allow rapid extraction of specific audited JSON keys (e.g., looking up when a certain threshold flipped)
CREATE INDEX idx_audit_logs_before_gin ON audit_logs USING GIN (before_json);
CREATE INDEX idx_audit_logs_after_gin ON audit_logs USING GIN (after_json);

-- Note: No updated_at or is_deleted columns. This is strictly an immutable append-only ledger.

CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
