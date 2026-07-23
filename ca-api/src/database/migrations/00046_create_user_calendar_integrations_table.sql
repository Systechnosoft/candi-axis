-- 00046_create_user_calendar_integrations_table.sql

CREATE TABLE IF NOT EXISTS user_calendar_integrations (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider varchar(50) NOT NULL DEFAULT 'GOOGLE',
  email text NULL,
  access_token text NULL,
  refresh_token text NOT NULL,
  expiry_date timestamptz NULL,
  scopes text[] NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_calendar_integrations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_user_calendar_provider UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user ON user_calendar_integrations(user_id);

-- Alter interviews table to add missing Google Meet/Calendar fields
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS meeting_provider varchar(50) NULL;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS external_calendar_event_id text NULL;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS calendar_event_link text NULL;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS calendar_sync_status varchar(50) NOT NULL DEFAULT 'NOT_CONNECTED';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS calendar_sync_error text NULL;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS invitation_sent_at timestamptz NULL;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS meeting_created_by uuid NULL;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS meeting_created_at timestamptz NULL;

-- Safely add foreign key constraint on interviews(meeting_created_by)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_interviews_meeting_created_by'
  ) THEN
    ALTER TABLE interviews ADD CONSTRAINT fk_interviews_meeting_created_by FOREIGN KEY (meeting_created_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS user_meeting_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL ,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider varchar(50) NOT NULL,
  provider_account_email varchar(150),
  provider_account_id varchar(100),
  encrypted_access_token text,
  encrypted_refresh_token text NOT NULL,
  token_expiry timestamptz,
  scopes text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  connected_at timestamptz NOT NULL DEFAULT now(),
  disconnected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_user_meeting_provider UNIQUE (user_id, provider)
);

CREATE UNIQUE INDEX idx_user_meeting_provider ON user_meeting_integrations(user_id, provider);
CREATE INDEX idx_user_meeting_integrations_org_id ON user_meeting_integrations(org_id);

CREATE TRIGGER trig_user_meeting_integrations_updated_at
BEFORE UPDATE ON user_meeting_integrations
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();
CREATE INDEX idx_user_calendar_integrations_org_id ON user_calendar_integrations(org_id);
