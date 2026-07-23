-- 00013_create_entity_tags_table.sql
CREATE TABLE IF NOT EXISTS entity_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type varchar(50) NOT NULL,
  entity_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  source varchar(30) NOT NULL DEFAULT 'manual',
  confidence numeric(5,4) NULL,
  is_starred boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,

  CONSTRAINT fk_entity_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  CONSTRAINT fk_entity_tags_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT uq_entity_tags UNIQUE (entity_type, entity_id, tag_id, source),
  CONSTRAINT chk_entity_tags_source CHECK (source IN ('manual', 'parser', 'ai')),
  CONSTRAINT chk_entity_tags_confidence CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

CREATE INDEX idx_entity_tags_entity ON entity_tags(entity_type, entity_id);
CREATE INDEX idx_entity_tags_tag_id ON entity_tags(tag_id);
CREATE INDEX idx_entity_tags_source ON entity_tags(source);
