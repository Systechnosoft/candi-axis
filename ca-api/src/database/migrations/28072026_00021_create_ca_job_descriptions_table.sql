CREATE SEQUENCE IF NOT EXISTS public.job_description_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE IF NOT EXISTS public.ca_job_descriptions (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requisition_id" "uuid" NOT NULL,
    "title" character varying(200) NOT NULL,
    "code" character varying(50) DEFAULT ('JD-'::"text" || "lpad"(("nextval"('"public"."job_description_code_seq"'::"regclass"))::"text", 3, '0'::"text")) NOT NULL,
    "location" character varying(150),
    "work_mode" character varying(30),
    "employment_type" character varying(30),
    "exp_min_months" integer,
    "exp_max_months" integer,
    "must_have_text" "text",
    "nice_to_have_text" "text",
    "job_summary" "text",
    "responsibilities_text" "text",
    "status" character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    "owner_user_id" "uuid",
    "published_internal_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_jd_employment_type" CHECK ((("employment_type" IS NULL) OR (("employment_type")::"text" = ANY ((ARRAY['full_time'::character varying, 'part_time'::character varying, 'contract'::character varying, 'internship'::character varying])::"text"[])))),
    CONSTRAINT "chk_jd_exp_range" CHECK ((("exp_min_months" IS NULL) OR ("exp_max_months" IS NULL) OR ("exp_max_months" >= "exp_min_months"))),
    CONSTRAINT "chk_jd_status" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'open'::character varying, 'on_hold'::character varying, 'closed'::character varying])::"text"[]))),
    CONSTRAINT "chk_jd_work_mode" CHECK ((("work_mode" IS NULL) OR (("work_mode")::"text" = ANY ((ARRAY['onsite'::character varying, 'remote'::character varying, 'hybrid'::character varying])::"text"[]))))
);

ALTER TABLE ONLY public.ca_job_descriptions
    ADD CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id");

CREATE INDEX "idx_jd_composite_req_status" ON public.ca_job_descriptions USING "btree" ("requisition_id", "status");

CREATE INDEX "idx_jd_composite_status_type" ON public.ca_job_descriptions USING "btree" ("status", "work_mode", "employment_type");

CREATE INDEX "idx_jd_deleted" ON public.ca_job_descriptions USING "btree" ("deleted_at");

CREATE INDEX "idx_jd_emp_type" ON public.ca_job_descriptions USING "btree" ("employment_type");

CREATE INDEX "idx_jd_is_deleted" ON public.ca_job_descriptions USING "btree" ("is_deleted");

CREATE INDEX "idx_jd_loc" ON public.ca_job_descriptions USING "btree" ("location");

CREATE INDEX "idx_jd_must_have_gin" ON public.ca_job_descriptions USING "gin" ("to_tsvector"('"english"'::"regconfig", "must_have_text"));

CREATE INDEX "idx_jd_nice_have_gin" ON public.ca_job_descriptions USING "gin" ("to_tsvector"('"english"'::"regconfig", "nice_to_have_text"));

CREATE INDEX "idx_jd_owner" ON public.ca_job_descriptions USING "btree" ("owner_user_id");

CREATE INDEX "idx_jd_req_id" ON public.ca_job_descriptions USING "btree" ("requisition_id");

CREATE INDEX "idx_jd_status" ON public.ca_job_descriptions USING "btree" ("status");

CREATE INDEX "idx_jd_summary_gin" ON public.ca_job_descriptions USING "gin" ("to_tsvector"('"english"'::"regconfig", "job_summary"));

CREATE INDEX "idx_jd_work_mode" ON public.ca_job_descriptions USING "btree" ("work_mode");

CREATE INDEX "idx_job_descriptions_org_id" ON public.ca_job_descriptions USING "btree" ("org_id");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_job_descriptions ADD CONSTRAINT "fk_jd_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_job_descriptions ADD CONSTRAINT "fk_jd_owner" FOREIGN KEY ("owner_user_id") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_job_descriptions ADD CONSTRAINT "fk_jd_requisition" FOREIGN KEY ("requisition_id") REFERENCES "public"."ca_job_requisitions"("id") ON DELETE CASCADE;
-- ALTER TABLE ONLY public.ca_job_descriptions ADD CONSTRAINT "fk_jd_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_job_descriptions ADD CONSTRAINT "fk_job_descriptions_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Triggers (Shared functions may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_jd_updated_at" BEFORE UPDATE ON "public"."ca_job_descriptions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
-- CREATE OR REPLACE TRIGGER "trig_protect_job_descriptions_code" BEFORE UPDATE ON "public"."ca_job_descriptions" FOR EACH ROW EXECUTE FUNCTION "public"."protect_code_column"();
