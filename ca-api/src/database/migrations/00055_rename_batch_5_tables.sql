-- 00055_rename_batch_5_tables.sql
ALTER TABLE IF EXISTS job_descriptions RENAME TO ca_job_descriptions;
ALTER TABLE IF EXISTS job_postings RENAME TO ca_job_postings;
ALTER TABLE IF EXISTS job_requisitions RENAME TO ca_job_requisitions;
ALTER TABLE IF EXISTS modules RENAME TO ca_modules;
ALTER TABLE IF EXISTS notes RENAME TO ca_notes;

-- Down Migration
/*
ALTER TABLE IF EXISTS ca_job_descriptions RENAME TO job_descriptions;
ALTER TABLE IF EXISTS ca_job_postings RENAME TO job_postings;
ALTER TABLE IF EXISTS ca_job_requisitions RENAME TO job_requisitions;
ALTER TABLE IF EXISTS ca_modules RENAME TO modules;
ALTER TABLE IF EXISTS ca_notes RENAME TO notes;
*/
