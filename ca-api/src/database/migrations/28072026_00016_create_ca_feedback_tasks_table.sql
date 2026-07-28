CREATE TABLE IF NOT EXISTS public.ca_feedback_tasks (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "interview_id" "uuid" NOT NULL,
    "interviewer_user_id" "uuid" NOT NULL,
    "due_at" timestamp with time zone NOT NULL,
    "status" character varying(30) DEFAULT 'open'::character varying NOT NULL,
    "reminders_sent_count" integer DEFAULT 0 NOT NULL,
    "last_reminder_at" timestamp with time zone,
    "submitted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_feedback_task_reminders" CHECK (("reminders_sent_count" >= 0)),
    CONSTRAINT "chk_feedback_task_status" CHECK ((("status")::"text" = ANY ((ARRAY['open'::character varying, 'submitted'::character varying, 'overdue'::character varying])::"text"[])))
);

ALTER TABLE ONLY public.ca_feedback_tasks
    ADD CONSTRAINT "feedback_tasks_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_feedback_tasks
    ADD CONSTRAINT "uq_feedback_task_interview_user" UNIQUE ("interview_id", "interviewer_user_id");

CREATE INDEX "idx_feedback_task_due" ON public.ca_feedback_tasks USING "btree" ("due_at");

CREATE UNIQUE INDEX "idx_feedback_task_interview_user_uq" ON public.ca_feedback_tasks USING "btree" ("interview_id", "interviewer_user_id");

CREATE INDEX "idx_feedback_task_status" ON public.ca_feedback_tasks USING "btree" ("status");

CREATE INDEX "idx_feedback_task_status_due" ON public.ca_feedback_tasks USING "btree" ("status", "due_at");

CREATE INDEX "idx_feedback_task_user" ON public.ca_feedback_tasks USING "btree" ("interviewer_user_id");

CREATE INDEX "idx_feedback_task_user_status" ON public.ca_feedback_tasks USING "btree" ("interviewer_user_id", "status");

CREATE INDEX "idx_feedback_tasks_org_id" ON public.ca_feedback_tasks USING "btree" ("org_id");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_feedback_tasks ADD CONSTRAINT "fk_feedback_task_interview" FOREIGN KEY ("interview_id") REFERENCES "public"."ca_interviews"("id") ON DELETE CASCADE;
-- ALTER TABLE ONLY public.ca_feedback_tasks ADD CONSTRAINT "fk_feedback_task_interviewer" FOREIGN KEY ("interviewer_user_id") REFERENCES "public"."ca_users"("id") ON DELETE RESTRICT;
-- ALTER TABLE ONLY public.ca_feedback_tasks ADD CONSTRAINT "fk_feedback_tasks_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Triggers (Shared function trigger_set_updated_at may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_feedback_tasks_updated_at" BEFORE UPDATE ON "public"."ca_feedback_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
