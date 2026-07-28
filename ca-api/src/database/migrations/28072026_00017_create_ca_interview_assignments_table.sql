CREATE TABLE IF NOT EXISTS public.ca_interview_assignments (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "interview_id" "uuid" NOT NULL,
    "interviewer_user_id" "uuid" NOT NULL,
    "assignment_role" character varying(50) DEFAULT 'interviewer'::character varying NOT NULL,
    "assignment_status" character varying(30) DEFAULT 'invited'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_assignment_status" CHECK ((("assignment_status")::"text" = ANY ((ARRAY['invited'::character varying, 'accepted'::character varying, 'declined'::character varying])::"text"[])))
);

ALTER TABLE ONLY public.ca_interview_assignments
    ADD CONSTRAINT "interview_assignments_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_interview_assignments
    ADD CONSTRAINT "uq_assignment_interview_user" UNIQUE ("interview_id", "interviewer_user_id");

CREATE INDEX "idx_interview_assignments_org_id" ON public.ca_interview_assignments USING "btree" ("org_id");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_interview_assignments ADD CONSTRAINT "fk_assignment_interview" FOREIGN KEY ("interview_id") REFERENCES "public"."ca_interviews"("id") ON DELETE CASCADE;
-- ALTER TABLE ONLY public.ca_interview_assignments ADD CONSTRAINT "fk_assignment_interviewer" FOREIGN KEY ("interviewer_user_id") REFERENCES "public"."ca_users"("id") ON DELETE RESTRICT;
-- ALTER TABLE ONLY public.ca_interview_assignments ADD CONSTRAINT "fk_interview_assignments_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Triggers (Shared function trigger_set_updated_at may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_assignments_updated_at" BEFORE UPDATE ON "public"."ca_interview_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
