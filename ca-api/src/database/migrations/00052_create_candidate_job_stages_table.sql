-- 00052_create_candidate_job_stages_table.sql
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.ai_ratings CASCADE;

CREATE TABLE IF NOT EXISTS public.candidate_job_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL ,
  job_posting_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  stage varchar(50) NOT NULL DEFAULT 'new',
  sub_stage varchar(50) DEFAULT NULL,
  stage_reason text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL,

  CONSTRAINT uq_candidate_job_stages UNIQUE (job_posting_id, candidate_id)
);

CREATE INDEX idx_candidate_job_stages_org_id ON public.candidate_job_stages(org_id);
CREATE INDEX idx_candidate_job_stages_job_posting ON public.candidate_job_stages(job_posting_id);
CREATE INDEX idx_candidate_job_stages_candidate ON public.candidate_job_stages(candidate_id);

CREATE TRIGGER trig_candidate_job_stages_updated_at
BEFORE UPDATE ON public.candidate_job_stages
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();