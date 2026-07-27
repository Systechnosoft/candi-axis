-- Up Migration
ALTER TABLE IF EXISTS user_roles RENAME TO ca_user_roles;
ALTER TABLE IF EXISTS users RENAME TO ca_users;

-- Down Migration
ALTER TABLE IF EXISTS ca_user_roles RENAME TO user_roles;
ALTER TABLE IF EXISTS ca_users RENAME TO users;
