-- 00014_create_notes_table.sql
CREATE TABLE IF NOT EXISTS notes (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type varchar(50) NOT NULL,
  entity_id uuid NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL,
  note_type varchar(30) NOT NULL DEFAULT 'general',
  visibility varchar(30) NOT NULL DEFAULT 'internal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,

  -- We restrict deletion on author so we don't accidentally orphan ATS system notes simply because a recruiter deactivated their account
  CONSTRAINT fk_notes_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT,
  
  CONSTRAINT chk_notes_content_not_empty CHECK (trim(content) <> ''),
  CONSTRAINT chk_notes_type CHECK (note_type IN ('general', 'screening', 'interview', 'decision')),
  CONSTRAINT chk_notes_visibility CHECK (visibility IN ('internal', 'restricted'))
);

CREATE INDEX idx_notes_entity ON notes(entity_type, entity_id);
CREATE INDEX idx_notes_author ON notes(author_id);
CREATE INDEX idx_notes_is_deleted ON notes(is_deleted);
CREATE INDEX idx_notes_deleted_at ON notes(deleted_at);

-- Searchable notes content for future keyword lookup across ATS trials
CREATE INDEX idx_notes_content_gin ON notes USING GIN (to_tsvector('english', content));

CREATE TRIGGER trig_notes_updated_at
BEFORE UPDATE ON notes
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_notes_org_id ON notes(org_id);
