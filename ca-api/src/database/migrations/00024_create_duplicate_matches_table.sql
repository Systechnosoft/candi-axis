-- 00024_create_duplicate_matches_table.sql
CREATE TABLE IF NOT EXISTS duplicate_matches (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incoming_candidate_id uuid NULL,
  matched_candidate_id uuid NOT NULL,
  candidate_submission_ref varchar(100) NULL,
  confidence_score numeric(5,4) NOT NULL,
  match_level varchar(30) NOT NULL,
  matching_signals jsonb NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'pending',
  override_reason text NULL,
  review_notes text NULL,
  reviewed_by uuid NULL,
  reviewed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_dup_incoming_cand FOREIGN KEY (incoming_candidate_id) REFERENCES candidates(id) ON DELETE SET NULL,
  CONSTRAINT fk_dup_matched_cand FOREIGN KEY (matched_candidate_id) REFERENCES candidates(id) ON DELETE RESTRICT,
  CONSTRAINT fk_dup_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT chk_dup_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1),
  CONSTRAINT chk_dup_match_level CHECK (match_level IN ('high', 'medium', 'low')),
  CONSTRAINT chk_dup_status CHECK (status IN ('pending', 'blocked', 'override_requested', 'override_approved', 'override_rejected', 'linked_existing', 'resolved'))
);

CREATE INDEX idx_dup_incoming_cand ON duplicate_matches(incoming_candidate_id);
CREATE INDEX idx_dup_matched_cand ON duplicate_matches(matched_candidate_id);
CREATE INDEX idx_dup_status ON duplicate_matches(status);
CREATE INDEX idx_dup_match_level ON duplicate_matches(match_level);
CREATE INDEX idx_dup_reviewed_by ON duplicate_matches(reviewed_by);
CREATE INDEX idx_dup_created_desc ON duplicate_matches(created_at DESC);

CREATE INDEX idx_dup_signals_gin ON duplicate_matches USING GIN (matching_signals);

CREATE TRIGGER trig_dup_matches_updated_at
BEFORE UPDATE ON duplicate_matches
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_duplicate_matches_org_id ON duplicate_matches(org_id);
