CREATE TABLE IF NOT EXISTS public.ca_candidates (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" character varying(200) NOT NULL,
    "first_name" character varying(100),
    "last_name" character varying(100),
    "email" character varying(320),
    "email_normalized" character varying(320),
    "email_verified" boolean DEFAULT false NOT NULL,
    "phone" character varying(30),
    "phone_normalized" character varying(30),
    "phone_verified" boolean DEFAULT false NOT NULL,
    "location" character varying(150),
    "total_exp_months" integer,
    "relevant_exp_months" integer,
    "current_company" character varying(150),
    "current_designation" character varying(150),
    "notice_period_days" integer,
    "current_ctc" numeric(12,2),
    "expected_ctc" numeric(12,2),
    "revised_expected_ctc" numeric(12,2),
    "secondary_email" character varying(320),
    "secondary_phone" character varying(30),
    "education_summary" character varying(255),
    "profile_summary" "text",
    "source" character varying(50),
    "status" character varying(30) DEFAULT 'active'::character varying NOT NULL,
    "last_resume_uploaded_at" timestamp with time zone,
    "profile_score" integer,
    "gap_details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_candidates_notice_period" CHECK ((("notice_period_days" IS NULL) OR ("notice_period_days" >= 0))),
    CONSTRAINT "chk_candidates_relevant_exp" CHECK ((("relevant_exp_months" IS NULL) OR ("relevant_exp_months" >= 0))),
    CONSTRAINT "chk_candidates_source" CHECK ((("source" IS NULL) OR (("source")::"text" = ANY ((ARRAY['resume_upload'::character varying, 'manual'::character varying, 'referral'::character varying, 'consultant'::character varying, 'job_board'::character varying, 'other'::character varying])::"text"[])))),
    CONSTRAINT "chk_candidates_status" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'archived'::character varying, 'blacklisted'::character varying, 'joined_elsewhere'::character varying])::"text"[]))),
    CONSTRAINT "chk_candidates_total_exp" CHECK ((("total_exp_months" IS NULL) OR ("total_exp_months" >= 0)))
);

ALTER TABLE ONLY public.ca_candidates
    ADD CONSTRAINT "candidates_pkey" PRIMARY KEY ("id");

CREATE INDEX "idx_candidates_deleted_at" ON public.ca_candidates USING "btree" ("deleted_at");

CREATE INDEX "idx_candidates_email_norm" ON public.ca_candidates USING "btree" ("email_normalized");

CREATE INDEX "idx_candidates_email_trgm" ON public.ca_candidates USING "gin" ("email_normalized" "public"."gin_trgm_ops");

CREATE INDEX "idx_candidates_is_deleted" ON public.ca_candidates USING "btree" ("is_deleted");

CREATE INDEX "idx_candidates_location" ON public.ca_candidates USING "btree" ("location");

CREATE INDEX "idx_candidates_name_trgm" ON public.ca_candidates USING "gin" ("full_name" "public"."gin_trgm_ops");

CREATE INDEX "idx_candidates_notice" ON public.ca_candidates USING "btree" ("notice_period_days");

CREATE INDEX "idx_candidates_org_id" ON public.ca_candidates USING "btree" ("org_id");

CREATE INDEX "idx_candidates_phone_norm" ON public.ca_candidates USING "btree" ("phone_normalized");

CREATE INDEX "idx_candidates_phone_trgm" ON public.ca_candidates USING "gin" ("phone_normalized" "public"."gin_trgm_ops");

CREATE INDEX "idx_candidates_relevant_exp" ON public.ca_candidates USING "btree" ("relevant_exp_months");

CREATE INDEX "idx_candidates_status" ON public.ca_candidates USING "btree" ("status");

CREATE INDEX "idx_candidates_status_exp" ON public.ca_candidates USING "btree" ("status", "total_exp_months");

CREATE INDEX "idx_candidates_status_loc" ON public.ca_candidates USING "btree" ("status", "location");

CREATE INDEX "idx_candidates_status_notice" ON public.ca_candidates USING "btree" ("status", "notice_period_days");

CREATE INDEX "idx_candidates_summary_gin" ON public.ca_candidates USING "gin" ("to_tsvector"('"english"'::"regconfig", "profile_summary"));

CREATE INDEX "idx_candidates_total_exp" ON public.ca_candidates USING "btree" ("total_exp_months");

CREATE INDEX "idx_candidates_updated_at" ON public.ca_candidates USING "btree" ("updated_at");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_candidates ADD CONSTRAINT "fk_candidates_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_candidates ADD CONSTRAINT "fk_candidates_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
-- ALTER TABLE ONLY public.ca_candidates ADD CONSTRAINT "fk_candidates_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;

-- Deferred Triggers (Shared function trigger_set_updated_at may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_candidates_updated_at" BEFORE UPDATE ON "public"."ca_candidates" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
