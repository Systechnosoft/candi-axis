-- Up
ALTER TABLE IF EXISTS candidate_employments RENAME TO ca_candidate_employments;
ALTER TABLE IF EXISTS candidate_job_stages RENAME TO ca_candidate_job_stages;
ALTER TABLE IF EXISTS candidate_projects RENAME TO ca_candidate_projects;
ALTER TABLE IF EXISTS candidate_social_links RENAME TO ca_candidate_social_links;
ALTER TABLE IF EXISTS candidates RENAME TO ca_candidates;

-- Down
ALTER TABLE IF EXISTS ca_candidate_employments RENAME TO candidate_employments;
ALTER TABLE IF EXISTS ca_candidate_job_stages RENAME TO candidate_job_stages;
ALTER TABLE IF EXISTS ca_candidate_projects RENAME TO candidate_projects;
ALTER TABLE IF EXISTS ca_candidate_social_links RENAME TO candidate_social_links;
ALTER TABLE IF EXISTS ca_candidates RENAME TO candidates;
