CREATE TABLE IF NOT EXISTS public.ca_candidate_job_stages (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "job_posting_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "stage" character varying(50) DEFAULT 'new'::character varying NOT NULL,
    "sub_stage" character varying(50) DEFAULT NULL::character varying,
    "stage_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);

ALTER TABLE ONLY public.ca_candidate_job_stages
    ADD CONSTRAINT "candidate_job_stages_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_candidate_job_stages
    ADD CONSTRAINT "uq_candidate_job_stages" UNIQUE ("job_posting_id", "candidate_id");

CREATE INDEX "idx_candidate_job_stages_candidate" ON public.ca_candidate_job_stages USING "btree" ("candidate_id");

CREATE INDEX "idx_candidate_job_stages_job_posting" ON public.ca_candidate_job_stages USING "btree" ("job_posting_id");

CREATE INDEX "idx_candidate_job_stages_org_id" ON public.ca_candidate_job_stages USING "btree" ("org_id");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_candidate_job_stages ADD CONSTRAINT "candidate_job_stages_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;
-- ALTER TABLE ONLY public.ca_candidate_job_stages ADD CONSTRAINT "candidate_job_stages_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "public"."ca_job_postings"("id") ON DELETE CASCADE;

-- Deferred Triggers (Shared function trigger_set_updated_at may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_candidate_job_stages_updated_at" BEFORE UPDATE ON "public"."ca_candidate_job_stages" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
