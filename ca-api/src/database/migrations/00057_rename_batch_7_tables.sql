-- Up Migration
ALTER TABLE IF EXISTS status_history RENAME TO ca_status_history;
ALTER TABLE IF EXISTS tags RENAME TO ca_tags;
ALTER TABLE IF EXISTS tasks RENAME TO ca_tasks;
ALTER TABLE IF EXISTS user_calendar_integrations RENAME TO ca_user_calendar_integrations;
ALTER TABLE IF EXISTS user_meeting_integrations RENAME TO ca_user_meeting_integrations;

-- Down Migration
ALTER TABLE IF EXISTS ca_status_history RENAME TO status_history;
ALTER TABLE IF EXISTS ca_tags RENAME TO tags;
ALTER TABLE IF EXISTS ca_tasks RENAME TO tasks;
ALTER TABLE IF EXISTS ca_user_calendar_integrations RENAME TO user_calendar_integrations;
ALTER TABLE IF EXISTS ca_user_meeting_integrations RENAME TO user_meeting_integrations;
