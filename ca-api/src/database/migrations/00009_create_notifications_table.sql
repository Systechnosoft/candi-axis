-- 00009_create_notifications_table.sql

CREATE TABLE IF NOT EXISTS notifications (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel varchar(30) NOT NULL,
  category varchar(50) NOT NULL,
  subject varchar(255) NULL,
  content jsonb NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'pending',
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz NULL,
  sent_at timestamptz NULL,
  related_entity_type varchar(50) NULL,
  related_entity_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_notifications_channel CHECK (channel IN ('in_app', 'email')),
  CONSTRAINT chk_notifications_status CHECK (status IN ('pending', 'sent', 'failed', 'read'))
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read_time ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_status_channel ON notifications(status, channel);
CREATE INDEX idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id);

CREATE TRIGGER trig_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_notifications_org_id ON notifications(org_id);
