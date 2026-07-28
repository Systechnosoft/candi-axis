CREATE TABLE IF NOT EXISTS public.ca_candidate_employments (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "company_name" character varying(255) NOT NULL,
    "job_title" character varying(150),
    "employment_type" character varying(50),
    "location" character varying(150),
    "start_date" "date",
    "end_date" "date",
    "is_current" boolean DEFAULT false NOT NULL,
    "duration_months" integer,
    "responsibilities_summary" "text",
    "technologies_used" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_cand_employments_company_not_empty" CHECK ((TRIM(BOTH FROM "company_name") <> ''::"text")),
    CONSTRAINT "chk_cand_employments_dates" CHECK ((("start_date" IS NULL) OR ("end_date" IS NULL) OR ("end_date" >= "start_date"))),
    CONSTRAINT "chk_cand_employments_type" CHECK ((("employment_type" IS NULL) OR (("employment_type")::"text" = ANY ((ARRAY['full_time'::character varying, 'part_time'::character varying, 'contract'::character varying, 'internship'::character varying, 'freelance'::character varying, 'other'::character varying])::"text"[]))))
);

ALTER TABLE ONLY public.ca_candidate_employments
    ADD CONSTRAINT "candidate_employments_pkey" PRIMARY KEY ("id");

CREATE INDEX "idx_cand_employments_cand" ON public.ca_candidate_employments USING "btree" ("candidate_id");

CREATE INDEX "idx_cand_employments_cand_current" ON public.ca_candidate_employments USING "btree" ("candidate_id", "is_current");

CREATE INDEX "idx_cand_employments_cand_sort" ON public.ca_candidate_employments USING "btree" ("candidate_id", "sort_order");

CREATE INDEX "idx_cand_employments_company" ON public.ca_candidate_employments USING "btree" ("company_name");

CREATE INDEX "idx_cand_employments_deleted" ON public.ca_candidate_employments USING "btree" ("deleted_at");

CREATE INDEX "idx_cand_employments_is_deleted" ON public.ca_candidate_employments USING "btree" ("is_deleted");

CREATE INDEX "idx_candidate_employments_org_id" ON public.ca_candidate_employments USING "btree" ("org_id");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_candidate_employments ADD CONSTRAINT "fk_cand_employments_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;
-- ALTER TABLE ONLY public.ca_candidate_employments ADD CONSTRAINT "fk_cand_employments_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_candidate_employments ADD CONSTRAINT "fk_cand_employments_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_candidate_employments ADD CONSTRAINT "fk_candidate_employments_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Triggers (Shared function trigger_set_updated_at may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_cand_employments_updated_at" BEFORE UPDATE ON "public"."ca_candidate_employments" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
