CREATE TABLE IF NOT EXISTS public.ca_notifications (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "channel" character varying(30) NOT NULL,
    "category" character varying(50) NOT NULL,
    "subject" character varying(255),
    "content" "jsonb" NOT NULL,
    "status" character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "read_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "related_entity_type" character varying(50),
    "related_entity_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_notifications_channel" CHECK ((("channel")::"text" = ANY ((ARRAY['in_app'::character varying, 'email'::character varying])::"text"[]))),
    CONSTRAINT "chk_notifications_status" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'failed'::character varying, 'read'::character varying])::"text"[])))
);

ALTER TABLE ONLY public.ca_notifications
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");

CREATE INDEX "idx_notifications_org_id" ON public.ca_notifications USING "btree" ("org_id");

CREATE INDEX "idx_notifications_related_entity" ON public.ca_notifications USING "btree" ("related_entity_type", "related_entity_id");

CREATE INDEX "idx_notifications_status_channel" ON public.ca_notifications USING "btree" ("status", "channel");

CREATE INDEX "idx_notifications_user_id" ON public.ca_notifications USING "btree" ("user_id");

CREATE INDEX "idx_notifications_user_read_time" ON public.ca_notifications USING "btree" ("user_id", "is_read", "created_at" DESC);

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_notifications ADD CONSTRAINT "fk_notifications_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
-- ALTER TABLE ONLY public.ca_notifications ADD CONSTRAINT "fk_notifications_user" FOREIGN KEY ("user_id") REFERENCES "public"."ca_users"("id") ON DELETE CASCADE;

-- Deferred Triggers (Shared functions may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_notifications_updated_at" BEFORE UPDATE ON "public"."ca_notifications" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
