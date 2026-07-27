-- Forward Migration
ALTER TABLE IF EXISTS contacts RENAME TO ca_contacts;
ALTER TABLE IF EXISTS documents RENAME TO ca_documents;
ALTER TABLE IF EXISTS duplicate_matches RENAME TO ca_duplicate_matches;
ALTER TABLE IF EXISTS entity_tags RENAME TO ca_entity_tags;
ALTER TABLE IF EXISTS feedback_submissions RENAME TO ca_feedback_submissions;

-- Down Migration
/*
ALTER TABLE IF EXISTS ca_contacts RENAME TO contacts;
ALTER TABLE IF EXISTS ca_documents RENAME TO documents;
ALTER TABLE IF EXISTS ca_duplicate_matches RENAME TO duplicate_matches;
ALTER TABLE IF EXISTS ca_entity_tags RENAME TO entity_tags;
ALTER TABLE IF EXISTS ca_feedback_submissions RENAME TO feedback_submissions;
*/
