CREATE TABLE IF NOT EXISTS public.ca_interviews (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "round_no" integer NOT NULL,
    "round_type" character varying(50) NOT NULL,
    "scheduled_start_utc" timestamp with time zone,
    "duration_mins" integer DEFAULT 60 NOT NULL,
    "mode" character varying(30) DEFAULT 'online'::character varying NOT NULL,
    "location" character varying(255),
    "meeting_link" character varying(1000),
    "status" character varying(30) DEFAULT 'scheduled'::character varying NOT NULL,
    "outlook_event_id" character varying(255),
    "outlook_status" character varying(30),
    "reschedule_reason" "text",
    "cancellation_reason" "text",
    "completed_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "meeting_provider" character varying(50),
    "external_calendar_event_id" "text",
    "calendar_event_link" "text",
    "calendar_sync_status" character varying(50) DEFAULT 'NOT_CONNECTED'::character varying NOT NULL,
    "calendar_sync_error" "text",
    "invitation_sent_at" timestamp with time zone,
    "meeting_created_by" "uuid",
    "meeting_created_at" timestamp with time zone,
    CONSTRAINT "chk_interviews_duration" CHECK (("duration_mins" > 0)),
    CONSTRAINT "chk_interviews_mode" CHECK ((("mode")::"text" = ANY ((ARRAY['online'::character varying, 'offline'::character varying])::"text"[]))),
    CONSTRAINT "chk_interviews_outlook" CHECK ((("outlook_status" IS NULL) OR (("outlook_status")::"text" = ANY ((ARRAY['pending'::character varying, 'created'::character varying, 'updated'::character varying, 'cancelled'::character varying, 'failed'::character varying])::"text"[])))),
    CONSTRAINT "chk_interviews_round" CHECK (("round_no" > 0)),
    CONSTRAINT "chk_interviews_status" CHECK ((("status")::"text" = ANY ((ARRAY['scheduled'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'no_show'::character varying])::"text"[]))),
    CONSTRAINT "chk_interviews_type" CHECK ((("round_type")::"text" = ANY ((ARRAY['screening'::character varying, 'tech1'::character varying, 'tech2'::character varying, 'manager'::character varying, 'hr'::character varying, 'other'::character varying])::"text"[])))
);

ALTER TABLE ONLY public.ca_interviews
    ADD CONSTRAINT "interviews_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_interviews
    ADD CONSTRAINT "uq_interviews_app_round" UNIQUE ("application_id", "round_no");

CREATE INDEX "idx_interviews_app" ON public.ca_interviews USING "btree" ("application_id");

CREATE UNIQUE INDEX "idx_interviews_app_round_uq" ON public.ca_interviews USING "btree" ("application_id", "round_no");

CREATE INDEX "idx_interviews_app_start" ON public.ca_interviews USING "btree" ("application_id", "scheduled_start_utc");

CREATE INDEX "idx_interviews_app_status" ON public.ca_interviews USING "btree" ("application_id", "status");

CREATE INDEX "idx_interviews_created_by" ON public.ca_interviews USING "btree" ("created_by");

CREATE INDEX "idx_interviews_deleted_at" ON public.ca_interviews USING "btree" ("deleted_at");

CREATE INDEX "idx_interviews_is_deleted" ON public.ca_interviews USING "btree" ("is_deleted");

CREATE INDEX "idx_interviews_org_id" ON public.ca_interviews USING "btree" ("org_id");

CREATE INDEX "idx_interviews_outlook_event" ON public.ca_interviews USING "btree" ("outlook_event_id");

CREATE INDEX "idx_interviews_scheduled_start" ON public.ca_interviews USING "btree" ("scheduled_start_utc");

CREATE INDEX "idx_interviews_status" ON public.ca_interviews USING "btree" ("status");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_interviews ADD CONSTRAINT "fk_interviews_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_interviews ADD CONSTRAINT "fk_interviews_meeting_created_by" FOREIGN KEY ("meeting_created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_interviews ADD CONSTRAINT "fk_interviews_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Triggers (Shared function trigger_set_updated_at may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_interviews_updated_at" BEFORE UPDATE ON "public"."ca_interviews" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
