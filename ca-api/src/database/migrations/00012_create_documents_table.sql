-- 00012_create_documents_table.sql
CREATE TABLE IF NOT EXISTS documents (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type varchar(50) NOT NULL,
  entity_id uuid NOT NULL,
  document_type varchar(50) NOT NULL,
  original_file_name varchar(255) NOT NULL,
  storage_bucket varchar(100) NOT NULL,
  storage_key varchar(500) NOT NULL,
  mime_type varchar(100) NOT NULL,
  file_size_bytes bigint NULL,
  file_hash varchar(128) NULL,
  parsed_text text NULL,
  parsed_json jsonb NULL,
  resume_hash varchar(128) NULL,
  parser_vendor varchar(100) NULL,
  parse_status varchar(30) NOT NULL DEFAULT 'pending',
  parse_error text NULL,
  parsed_at timestamptz NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,

  CONSTRAINT fk_documents_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_documents_storage_key_not_empty CHECK (trim(storage_key) <> ''),
  CONSTRAINT chk_documents_type_not_empty CHECK (trim(document_type) <> ''),
  CONSTRAINT chk_documents_parse_status CHECK (parse_status IN ('pending', 'processing', 'completed', 'failed', 'skipped'))
);

CREATE INDEX idx_documents_entity_id ON documents(entity_type, entity_id);
CREATE INDEX idx_documents_entity_type_doc ON documents(entity_type, entity_id, document_type);
CREATE UNIQUE INDEX uq_documents_storage ON documents(storage_bucket, storage_key);
CREATE INDEX idx_documents_file_hash ON documents(file_hash);
CREATE INDEX idx_documents_resume_hash ON documents(resume_hash);
CREATE INDEX idx_documents_parse_status ON documents(parse_status);

-- Add GIN index for full-text search over the parsing output
CREATE INDEX idx_documents_parsed_text_gin ON documents USING GIN (to_tsvector('english', parsed_text));

CREATE INDEX idx_documents_is_deleted ON documents(is_deleted);
CREATE INDEX idx_documents_deleted_at ON documents(deleted_at);

CREATE TRIGGER trig_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_documents_org_id ON documents(org_id);
