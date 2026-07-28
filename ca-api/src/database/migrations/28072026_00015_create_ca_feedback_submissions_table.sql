CREATE TABLE IF NOT EXISTS public.ca_feedback_submissions (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feedback_task_id" "uuid" NOT NULL,
    "interview_id" "uuid" NOT NULL,
    "interviewer_user_id" "uuid" NOT NULL,
    "tech_rating" numeric(4,2),
    "comms_rating" numeric(4,2),
    "problem_solving_rating" numeric(4,2),
    "culture_fit_rating" numeric(4,2),
    "overall_rating" numeric(4,2),
    "recommendation" character varying(30) NOT NULL,
    "strengths" "text",
    "risks" "text",
    "notes" "text",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_feedback_sub_comms_rating" CHECK ((("comms_rating" IS NULL) OR (("comms_rating" >= (0)::numeric) AND ("comms_rating" <= (5)::numeric)))),
    CONSTRAINT "chk_feedback_sub_culture_rating" CHECK ((("culture_fit_rating" IS NULL) OR (("culture_fit_rating" >= (0)::numeric) AND ("culture_fit_rating" <= (5)::numeric)))),
    CONSTRAINT "chk_feedback_sub_overall_rating" CHECK ((("overall_rating" IS NULL) OR (("overall_rating" >= (0)::numeric) AND ("overall_rating" <= (5)::numeric)))),
    CONSTRAINT "chk_feedback_sub_ps_rating" CHECK ((("problem_solving_rating" IS NULL) OR (("problem_solving_rating" >= (0)::numeric) AND ("problem_solving_rating" <= (5)::numeric)))),
    CONSTRAINT "chk_feedback_sub_recommendation" CHECK ((("recommendation")::"text" = ANY ((ARRAY['strong_yes'::character varying, 'yes'::character varying, 'maybe'::character varying, 'no'::character varying, 'strong_no'::character varying])::"text"[]))),
    CONSTRAINT "chk_feedback_sub_tech_rating" CHECK ((("tech_rating" IS NULL) OR (("tech_rating" >= (0)::numeric) AND ("tech_rating" <= (5)::numeric))))
);

ALTER TABLE ONLY public.ca_feedback_submissions
    ADD CONSTRAINT "feedback_submissions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_feedback_submissions
    ADD CONSTRAINT "uq_feedback_sub_task" UNIQUE ("feedback_task_id");

CREATE INDEX "idx_feedback_sub_interview" ON public.ca_feedback_submissions USING "btree" ("interview_id");

CREATE INDEX "idx_feedback_sub_recommendation" ON public.ca_feedback_submissions USING "btree" ("recommendation");

CREATE INDEX "idx_feedback_sub_submitted" ON public.ca_feedback_submissions USING "btree" ("submitted_at");

CREATE UNIQUE INDEX "idx_feedback_sub_task_uq" ON public.ca_feedback_submissions USING "btree" ("feedback_task_id");

CREATE INDEX "idx_feedback_sub_user" ON public.ca_feedback_submissions USING "btree" ("interviewer_user_id");

CREATE INDEX "idx_feedback_submissions_org_id" ON public.ca_feedback_submissions USING "btree" ("org_id");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_feedback_submissions ADD CONSTRAINT "fk_feedback_sub_interview" FOREIGN KEY ("interview_id") REFERENCES "public"."ca_interviews"("id") ON DELETE CASCADE;
-- ALTER TABLE ONLY public.ca_feedback_submissions ADD CONSTRAINT "fk_feedback_sub_interviewer" FOREIGN KEY ("interviewer_user_id") REFERENCES "public"."ca_users"("id") ON DELETE RESTRICT;
-- ALTER TABLE ONLY public.ca_feedback_submissions ADD CONSTRAINT "fk_feedback_sub_task" FOREIGN KEY ("feedback_task_id") REFERENCES "public"."ca_feedback_tasks"("id") ON DELETE CASCADE;
-- ALTER TABLE ONLY public.ca_feedback_submissions ADD CONSTRAINT "fk_feedback_submissions_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Triggers (Shared function trigger_set_updated_at may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_feedback_subs_updated_at" BEFORE UPDATE ON "public"."ca_feedback_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
