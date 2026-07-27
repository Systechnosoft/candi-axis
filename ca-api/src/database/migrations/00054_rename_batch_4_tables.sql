-- Forward Migration
ALTER TABLE IF EXISTS feedback_tasks RENAME TO ca_feedback_tasks;
ALTER TABLE IF EXISTS interview_assignments RENAME TO ca_interview_assignments;
ALTER TABLE IF EXISTS interview_provider_configurations RENAME TO ca_interview_provider_configurations;
ALTER TABLE IF EXISTS interviews RENAME TO ca_interviews;
ALTER TABLE IF EXISTS job_candidate_matches RENAME TO ca_job_candidate_matches;

-- Down Migration
/*
ALTER TABLE IF EXISTS ca_feedback_tasks RENAME TO feedback_tasks;
ALTER TABLE IF EXISTS ca_interview_assignments RENAME TO interview_assignments;
ALTER TABLE IF EXISTS ca_interview_provider_configurations RENAME TO interview_provider_configurations;
ALTER TABLE IF EXISTS ca_interviews RENAME TO interviews;
ALTER TABLE IF EXISTS ca_job_candidate_matches RENAME TO job_candidate_matches;
*/
