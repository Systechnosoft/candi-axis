CREATE TABLE IF NOT EXISTS public.ca_candidate_educations (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "qualification_level" character varying(50),
    "degree" character varying(150),
    "field_of_study" character varying(150),
    "institution_name" character varying(255),
    "start_year" integer,
    "end_year" integer,
    "grade_or_percentage" character varying(50),
    "is_highest" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_cand_educations_level" CHECK ((("qualification_level" IS NULL) OR (("qualification_level")::"text" = ANY ((ARRAY['secondary'::character varying, 'higher_secondary'::character varying, 'diploma'::character varying, 'bachelor'::character varying, 'master'::character varying, 'doctorate'::character varying, 'other'::character varying])::"text"[])))),
    CONSTRAINT "chk_cand_educations_years" CHECK ((("start_year" IS NULL) OR ("end_year" IS NULL) OR ("end_year" >= "start_year")))
);

ALTER TABLE ONLY public.ca_candidate_educations
    ADD CONSTRAINT "candidate_educations_pkey" PRIMARY KEY ("id");

CREATE INDEX "idx_cand_educations_cand" ON public.ca_candidate_educations USING "btree" ("candidate_id");

CREATE INDEX "idx_cand_educations_cand_highest" ON public.ca_candidate_educations USING "btree" ("candidate_id", "is_highest");

CREATE INDEX "idx_cand_educations_cand_sort" ON public.ca_candidate_educations USING "btree" ("candidate_id", "sort_order");

CREATE INDEX "idx_cand_educations_deleted" ON public.ca_candidate_educations USING "btree" ("deleted_at");

CREATE INDEX "idx_cand_educations_is_deleted" ON public.ca_candidate_educations USING "btree" ("is_deleted");

CREATE INDEX "idx_candidate_educations_org_id" ON public.ca_candidate_educations USING "btree" ("org_id");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_candidate_educations ADD CONSTRAINT "fk_cand_educations_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;
-- ALTER TABLE ONLY public.ca_candidate_educations ADD CONSTRAINT "fk_cand_educations_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_candidate_educations ADD CONSTRAINT "fk_cand_educations_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_candidate_educations ADD CONSTRAINT "fk_candidate_educations_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Triggers (Shared function trigger_set_updated_at may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_cand_educations_updated_at" BEFORE UPDATE ON "public"."ca_candidate_educations" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
