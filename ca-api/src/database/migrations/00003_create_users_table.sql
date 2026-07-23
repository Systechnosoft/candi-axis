-- 00003_create_users_table.sql

CREATE TABLE IF NOT EXISTS users (
  org_id uuid NULL,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(320) NOT NULL,
  email_normalized varchar(320) NOT NULL, 
  full_name varchar(200) NOT NULL,
  first_name varchar(100) NULL,
  last_name varchar(100) NULL,
  phone varchar(30) NULL,
  phone_normalized varchar(30) NULL,
  employee_code varchar(50) NULL,
  designation varchar(100) NULL,
  department varchar(100) NULL,
  status varchar(30) NOT NULL DEFAULT 'active',
  timezone varchar(100) NOT NULL DEFAULT 'Asia/Kolkata',
  last_login_at timestamptz NULL,
  supabase_auth_user_id uuid NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  deleted_at timestamptz NULL,
  is_deleted boolean NOT NULL DEFAULT false,

  CONSTRAINT chk_users_status CHECK (status IN ('active', 'inactive', 'locked', 'invited')),
  CONSTRAINT uq_users_email_normalized UNIQUE (email_normalized)
);

-- Self-referencing FKs
ALTER TABLE users ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Indexes
CREATE UNIQUE INDEX idx_users_email_normalized ON users(email_normalized);
CREATE UNIQUE INDEX idx_users_supabase_auth_user_id ON users(supabase_auth_user_id) WHERE supabase_auth_user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_users_employee_code ON users(employee_code) WHERE employee_code IS NOT NULL;
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_full_name ON users(full_name);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_users_is_deleted ON users(is_deleted);

-- Update Trigger
CREATE TRIGGER trig_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_users_org_id ON users(org_id);
