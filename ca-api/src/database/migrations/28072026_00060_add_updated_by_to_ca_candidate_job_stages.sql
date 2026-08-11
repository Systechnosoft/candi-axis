ALTER TABLE public.ca_candidate_job_stages ADD COLUMN IF NOT EXISTS "updated_by" "uuid";
ALTER TABLE ONLY public.ca_candidate_job_stages ADD CONSTRAINT "fk_candidate_job_stages_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
