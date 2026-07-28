CREATE TABLE IF NOT EXISTS public.ca_interview_provider_configurations (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "provider" character varying(50) NOT NULL,
    "display_name" character varying(100) NOT NULL,
    "auth_mode" character varying(50) NOT NULL,
    "config_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "encrypted_credentials_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_test_status" character varying(50),
    "last_test_message" "text",
    "last_tested_at" timestamp with time zone
);

ALTER TABLE ONLY public.ca_interview_provider_configurations
    ADD CONSTRAINT "interview_provider_configurations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_interview_provider_configurations
    ADD CONSTRAINT "uq_interview_provider_configs" UNIQUE ("provider");

CREATE UNIQUE INDEX "idx_interview_provider_configs" ON public.ca_interview_provider_configurations USING "btree" ("provider");

CREATE INDEX "idx_interview_provider_configurations_org_id" ON public.ca_interview_provider_configurations USING "btree" ("org_id");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_interview_provider_configurations ADD CONSTRAINT "fk_interview_provider_configurations_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Triggers (Shared function trigger_set_updated_at may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_interview_provider_configs_updated_at" BEFORE UPDATE ON "public"."ca_interview_provider_configurations" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
