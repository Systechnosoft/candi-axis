ALTER TABLE public.ca_candidate_job_stages DROP CONSTRAINT IF EXISTS "fk_candidate_job_stages_updated_by";
ALTER TABLE public.ca_candidate_job_stages DROP COLUMN IF EXISTS "updated_by";
