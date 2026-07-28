CREATE SEQUENCE IF NOT EXISTS public.job_posting_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE IF NOT EXISTS public.ca_job_postings (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) DEFAULT ('JP-'::"text" || "lpad"(("nextval"('"public"."job_posting_code_seq"'::"regclass"))::"text", 3, '0'::"text")) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "jd_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "hr_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "interviewer_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);

ALTER TABLE ONLY public.ca_job_postings
    ADD CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_job_postings
    ADD CONSTRAINT "job_postings_jd_id_key" UNIQUE ("jd_id");

CREATE INDEX "idx_job_postings_is_active" ON public.ca_job_postings USING "btree" ("is_active");

CREATE INDEX "idx_job_postings_jd_id" ON public.ca_job_postings USING "btree" ("jd_id");

CREATE INDEX "idx_job_postings_org_id" ON public.ca_job_postings USING "btree" ("org_id");

-- Included Foreign Keys (Referenced tables already exist):
ALTER TABLE ONLY public.ca_job_postings ADD CONSTRAINT "fk_job_postings_jd" FOREIGN KEY ("jd_id") REFERENCES "public"."ca_job_descriptions"("id") ON DELETE CASCADE;

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_job_postings ADD CONSTRAINT "fk_job_postings_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_job_postings ADD CONSTRAINT "fk_job_postings_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
-- ALTER TABLE ONLY public.ca_job_postings ADD CONSTRAINT "fk_job_postings_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;

-- Deferred Triggers (Shared functions may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_job_postings_updated_at" BEFORE UPDATE ON "public"."ca_job_postings" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
-- CREATE OR REPLACE TRIGGER "trig_protect_job_postings_code" BEFORE UPDATE ON "public"."ca_job_postings" FOR EACH ROW EXECUTE FUNCTION "public"."protect_code_column"();
