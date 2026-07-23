-- 00027_create_interviews_table.sql
CREATE TABLE IF NOT EXISTS interviews (
  org_id uuid NOT NULL ,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  round_no integer NOT NULL,
  round_type varchar(50) NOT NULL,
  scheduled_start_utc timestamptz NULL,
  duration_mins integer NOT NULL DEFAULT 60,
  mode varchar(30) NOT NULL DEFAULT 'online',
  location varchar(255) NULL,
  meeting_link varchar(1000) NULL,
  status varchar(30) NOT NULL DEFAULT 'scheduled',
  outlook_event_id varchar(255) NULL,
  outlook_status varchar(30) NULL,
  reschedule_reason text NULL,
  cancellation_reason text NULL,
  completed_at timestamptz NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  is_deleted boolean NOT NULL DEFAULT false,

  meeting_provider varchar(50) NULL,
  external_calendar_event_id text NULL,
  calendar_event_link text NULL,
  calendar_sync_status varchar(50) NOT NULL DEFAULT 'NOT_CONNECTED',
  calendar_sync_error text NULL,
  invitation_sent_at timestamptz NULL,
  meeting_created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  meeting_created_at timestamptz NULL,
  CONSTRAINT fk_interviews_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_interviews_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT uq_interviews_app_round UNIQUE (application_id, round_no),

  CONSTRAINT chk_interviews_round CHECK (round_no > 0),
  CONSTRAINT chk_interviews_duration CHECK (duration_mins > 0),
  CONSTRAINT chk_interviews_type CHECK (round_type IN ('screening', 'tech1', 'tech2', 'manager', 'hr', 'other')),
  CONSTRAINT chk_interviews_mode CHECK (mode IN ('online', 'offline')),
  CONSTRAINT chk_interviews_status CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  CONSTRAINT chk_interviews_outlook CHECK (outlook_status IS NULL OR outlook_status IN ('pending', 'created', 'updated', 'cancelled', 'failed'))
);

CREATE UNIQUE INDEX idx_interviews_app_round_uq ON interviews(application_id, round_no);
CREATE INDEX idx_interviews_app ON interviews(application_id);
CREATE INDEX idx_interviews_status ON interviews(status);
CREATE INDEX idx_interviews_scheduled_start ON interviews(scheduled_start_utc);
CREATE INDEX idx_interviews_outlook_event ON interviews(outlook_event_id);
CREATE INDEX idx_interviews_created_by ON interviews(created_by);
CREATE INDEX idx_interviews_deleted_at ON interviews(deleted_at);
CREATE INDEX idx_interviews_is_deleted ON interviews(is_deleted);

CREATE INDEX idx_interviews_app_status ON interviews(application_id, status);
CREATE INDEX idx_interviews_app_start ON interviews(application_id, scheduled_start_utc);

CREATE TRIGGER trig_interviews_updated_at
BEFORE UPDATE ON interviews
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_interviews_org_id ON interviews(org_id);
