-- 00023_create_candidate_social_links_table.sql
CREATE TABLE IF NOT EXISTS candidate_social_links (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  link_type varchar(50) NOT NULL,
  url varchar(1000) NOT NULL,
  display_label varchar(150) NULL,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  deleted_at timestamptz NULL,
  is_deleted boolean NOT NULL DEFAULT false,

  CONSTRAINT fk_cand_social_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_cand_social_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_cand_social_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT chk_cand_social_url_not_empty CHECK (trim(url) <> ''),
  CONSTRAINT chk_cand_social_type CHECK (link_type IN ('linkedin', 'github', 'portfolio', 'website', 'other'))
);

-- Partial unique ensuring only one primary link of the same type natively per candidate
CREATE UNIQUE INDEX uq_cand_social_primary_type ON candidate_social_links(candidate_id, link_type) WHERE is_primary = true;

CREATE INDEX idx_cand_social_cand ON candidate_social_links(candidate_id);
CREATE INDEX idx_cand_social_cand_type ON candidate_social_links(candidate_id, link_type);
CREATE INDEX idx_cand_social_deleted ON candidate_social_links(deleted_at);
CREATE INDEX idx_cand_social_is_deleted ON candidate_social_links(is_deleted);

CREATE TRIGGER trig_cand_social_updated_at
BEFORE UPDATE ON candidate_social_links
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_candidate_social_links_org_id ON candidate_social_links(org_id);
