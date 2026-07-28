CREATE TABLE IF NOT EXISTS public.ca_user_meeting_integrations (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" character varying(50) NOT NULL,
    "provider_account_email" character varying(150),
    "provider_account_id" character varying(100),
    "encrypted_access_token" "text",
    "encrypted_refresh_token" "text" NOT NULL,
    "token_expiry" timestamp with time zone,
    "scopes" "text"[] DEFAULT '{}'::"text"[],
    "is_active" boolean DEFAULT true,
    "connected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "disconnected_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY public.ca_user_meeting_integrations
    ADD CONSTRAINT "user_meeting_integrations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_user_meeting_integrations
    ADD CONSTRAINT "uq_user_meeting_provider" UNIQUE ("user_id", "provider");

CREATE INDEX "idx_user_meeting_integrations_org_id" ON public.ca_user_meeting_integrations USING "btree" ("org_id");
CREATE UNIQUE INDEX "idx_user_meeting_provider" ON public.ca_user_meeting_integrations USING "btree" ("user_id", "provider");

-- Included Foreign Keys (Referenced tables are already created):
ALTER TABLE ONLY public.ca_user_meeting_integrations ADD CONSTRAINT "fk_user_meeting_integrations_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_user_meeting_integrations ADD CONSTRAINT "user_meeting_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."ca_users"("id") ON DELETE CASCADE;

-- Deferred Triggers (Shared functions may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_user_meeting_integrations_updated_at" BEFORE UPDATE ON "public"."ca_user_meeting_integrations" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
