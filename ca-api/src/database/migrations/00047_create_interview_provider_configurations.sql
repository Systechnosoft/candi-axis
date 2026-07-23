-- 00047_create_interview_provider_configurations.sql
CREATE TABLE IF NOT EXISTS interview_provider_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL ,
  provider varchar(50) NOT NULL,
  display_name varchar(100) NOT NULL,
  auth_mode varchar(50) NOT NULL,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  encrypted_credentials_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_test_status varchar(50),
  last_test_message text,
  last_tested_at timestamptz,

  CONSTRAINT uq_interview_provider_configs UNIQUE (provider)
);

CREATE UNIQUE INDEX idx_interview_provider_configs ON interview_provider_configurations(provider);
CREATE INDEX idx_interview_provider_configurations_org_id ON interview_provider_configurations(org_id);

CREATE TRIGGER trig_interview_provider_configs_updated_at
BEFORE UPDATE ON interview_provider_configurations
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();