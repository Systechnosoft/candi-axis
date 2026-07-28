CREATE TABLE IF NOT EXISTS public.ca_admin_settings (
    "org_id" "uuid",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "setting_key" character varying(100) NOT NULL,
    "setting_value" "jsonb" NOT NULL,
    "value_type" character varying(30) DEFAULT 'json'::character varying NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    CONSTRAINT "chk_admin_settings_value_type" CHECK ((("value_type")::"text" = ANY ((ARRAY['string'::character varying, 'number'::character varying, 'boolean'::character varying, 'json'::character varying])::"text"[])))
);

ALTER TABLE ONLY public.ca_admin_settings
    ADD CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_admin_settings
    ADD CONSTRAINT "uq_admin_settings_key" UNIQUE ("setting_key");

CREATE INDEX "idx_admin_settings_active" ON public.ca_admin_settings USING "btree" ("is_active");

CREATE UNIQUE INDEX "idx_admin_settings_key" ON public.ca_admin_settings USING "btree" ("setting_key");

CREATE INDEX "idx_admin_settings_org_id" ON public.ca_admin_settings USING "btree" ("org_id");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_admin_settings ADD CONSTRAINT "fk_admin_settings_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
-- ALTER TABLE ONLY public.ca_admin_settings ADD CONSTRAINT "fk_admin_settings_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;

-- Deferred Triggers (Shared function trigger_set_updated_at may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_admin_settings_updated_at" BEFORE UPDATE ON "public"."ca_admin_settings" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
