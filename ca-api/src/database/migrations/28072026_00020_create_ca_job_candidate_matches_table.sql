CREATE TABLE IF NOT EXISTS public.ca_job_candidate_matches (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "rating" double precision NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "deleted_at" timestamp with time zone,
    "last_processed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY public.ca_job_candidate_matches
    ADD CONSTRAINT "job_candidate_matches_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_job_candidate_matches
    ADD CONSTRAINT "uq_jcm_job_candidate" UNIQUE ("job_id", "candidate_id");

CREATE INDEX "idx_jcm_candidate" ON public.ca_job_candidate_matches USING "btree" ("candidate_id");

CREATE INDEX "idx_jcm_created_at" ON public.ca_job_candidate_matches USING "btree" ("created_at");

CREATE INDEX "idx_jcm_deleted_at" ON public.ca_job_candidate_matches USING "btree" ("deleted_at");

CREATE INDEX "idx_jcm_is_active" ON public.ca_job_candidate_matches USING "btree" ("is_active");

CREATE INDEX "idx_jcm_job" ON public.ca_job_candidate_matches USING "btree" ("job_id");

CREATE UNIQUE INDEX "idx_jcm_job_candidate_uq" ON public.ca_job_candidate_matches USING "btree" ("job_id", "candidate_id");

CREATE INDEX "idx_job_candidate_matches_org_id" ON public.ca_job_candidate_matches USING "btree" ("org_id");

-- Included Foreign Keys (Referenced tables already exist):
ALTER TABLE ONLY public.ca_job_candidate_matches ADD CONSTRAINT "fk_jcm_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_job_candidate_matches ADD CONSTRAINT "fk_jcm_jd" FOREIGN KEY ("job_id") REFERENCES "public"."ca_job_descriptions"("id") ON DELETE CASCADE;
-- ALTER TABLE ONLY public.ca_job_candidate_matches ADD CONSTRAINT "fk_job_candidate_matches_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Triggers (Shared function trigger_set_updated_at may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_job_candidate_matches_updated_at" BEFORE UPDATE ON "public"."ca_job_candidate_matches" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
