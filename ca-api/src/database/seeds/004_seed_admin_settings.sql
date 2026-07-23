-- 004_seed_admin_settings.sql

INSERT INTO admin_settings (org_id, setting_key, setting_value, value_type, description)
VALUES
  ('7af2ebf4-6888-4757-a585-bcd9115bb0da', 'duplicate_threshold_high', '0.90', 'number', 'Trigram similarity above this strictly blocks applicant intake.'),
  ('7af2ebf4-6888-4757-a585-bcd9115bb0da', 'duplicate_threshold_medium', '0.75', 'number', 'Trigram similarity above this triggers manual duplicate review override workflow.'),
  ('7af2ebf4-6888-4757-a585-bcd9115bb0da', 'feedback_sla_hours', '48', 'number', 'Hours given to interviewers to submit feedback before marking overdue.'),
  ('7af2ebf4-6888-4757-a585-bcd9115bb0da', 'feedback_escalation_hours', '72', 'number', 'Hours passed before overdue feedback escalates to hiring managers/HR.'),
  ('7af2ebf4-6888-4757-a585-bcd9115bb0da', 'screening_any_one_feedback_allowed', 'false', 'boolean', 'Whether a single positive interviewer feedback auto-moves pipeline laterally.'),
  ('7af2ebf4-6888-4757-a585-bcd9115bb0da', 'default_timezone', '"Asia/Kolkata"', 'string', 'System default timezone for interview scheduling assumptions.'),
  ('7af2ebf4-6888-4757-a585-bcd9115bb0da', 'notification_email_enabled', 'true', 'boolean', 'Global kill-switch for sending outboard SMTP emails.'),
  ('7af2ebf4-6888-4757-a585-bcd9115bb0da', 'high_priority_reschedule_window_hours', '24', 'number', 'Interviews rescheduled within this window flag urgent notifications.')
ON CONFLICT (setting_key) DO UPDATE 
SET 
  org_id = EXCLUDED.org_id,
  setting_value = EXCLUDED.setting_value,
  value_type = EXCLUDED.value_type,
  description = EXCLUDED.description;
