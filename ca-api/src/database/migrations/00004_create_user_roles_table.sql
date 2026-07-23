-- 00004_create_user_roles_table.sql

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT uq_user_roles_mapping UNIQUE (user_id, role_id)
);

-- Partial unique for primary role (so a user only has one true primary role)
CREATE UNIQUE INDEX idx_user_roles_primary ON user_roles(user_id) WHERE is_primary = true;
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE UNIQUE INDEX idx_user_roles_user_role_composite ON user_roles(user_id, role_id);
