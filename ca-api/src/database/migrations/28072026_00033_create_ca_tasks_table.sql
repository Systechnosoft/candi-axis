CREATE TABLE IF NOT EXISTS public.ca_tasks (
    "org_id" "uuid" NOT NULL,
    "task_id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "assignee" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "assigned_on" timestamp with time zone DEFAULT "now"() NOT NULL,
    "jd_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "application_id" "uuid" NOT NULL,
    "jobposting_id" "uuid" NOT NULL,
    "submitted_on" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "status" character varying(30) DEFAULT 'new'::character varying NOT NULL,
    "submitted_by" "uuid",
    "feedback_action" character varying(30),
    "feedback_reason" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "task_code" character varying(30),
    "feedback_submission_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY public.ca_tasks
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("task_id");

ALTER TABLE ONLY public.ca_tasks
    ADD CONSTRAINT "tasks_task_code_key" UNIQUE ("task_code");

CREATE INDEX "idx_tasks_application_id" ON public.ca_tasks USING "btree" ("application_id");
CREATE INDEX "idx_tasks_candidate_id" ON public.ca_tasks USING "btree" ("candidate_id");
CREATE INDEX "idx_tasks_is_active" ON public.ca_tasks USING "btree" ("is_active");
CREATE INDEX "idx_tasks_jd_id" ON public.ca_tasks USING "btree" ("jd_id");
CREATE INDEX "idx_tasks_jobposting_id" ON public.ca_tasks USING "btree" ("jobposting_id");
CREATE INDEX "idx_tasks_org_id" ON public.ca_tasks USING "btree" ("org_id");
CREATE INDEX "idx_tasks_status" ON public.ca_tasks USING "btree" ("status");

-- Included Foreign Keys (Referenced tables are already created):
ALTER TABLE ONLY public.ca_tasks ADD CONSTRAINT "fk_tasks_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;
ALTER TABLE ONLY public.ca_tasks ADD CONSTRAINT "fk_tasks_jd" FOREIGN KEY ("jd_id") REFERENCES "public"."ca_job_descriptions"("id") ON DELETE CASCADE;
ALTER TABLE ONLY public.ca_tasks ADD CONSTRAINT "fk_tasks_jobposting" FOREIGN KEY ("jobposting_id") REFERENCES "public"."ca_job_postings"("id") ON DELETE CASCADE;
ALTER TABLE ONLY public.ca_tasks ADD CONSTRAINT "fk_tasks_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY public.ca_tasks ADD CONSTRAINT "tasks_feedback_submission_id_fkey" FOREIGN KEY ("feedback_submission_id") REFERENCES "public"."ca_feedback_submissions"("id") ON DELETE SET NULL;

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_tasks ADD CONSTRAINT "fk_tasks_submitted_by" FOREIGN KEY ("submitted_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;

-- Deferred Triggers (Shared functions may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_tasks_updated_at" BEFORE UPDATE ON "public"."ca_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
