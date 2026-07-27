-- Up
ALTER TABLE IF EXISTS addresses RENAME TO ca_addresses;
ALTER TABLE IF EXISTS admin_settings RENAME TO ca_admin_settings;
ALTER TABLE IF EXISTS audit_logs RENAME TO ca_audit_logs;
ALTER TABLE IF EXISTS candidate_certifications RENAME TO ca_candidate_certifications;
ALTER TABLE IF EXISTS candidate_educations RENAME TO ca_candidate_educations;

-- Down
ALTER TABLE IF EXISTS ca_addresses RENAME TO addresses;
ALTER TABLE IF EXISTS ca_admin_settings RENAME TO admin_settings;
ALTER TABLE IF EXISTS ca_audit_logs RENAME TO audit_logs;
ALTER TABLE IF EXISTS ca_candidate_certifications RENAME TO candidate_certifications;
ALTER TABLE IF EXISTS ca_candidate_educations RENAME TO candidate_educations;
