CREATE TABLE IF NOT EXISTS public.ca_user_calendar_integrations (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" character varying(50) DEFAULT 'GOOGLE'::character varying NOT NULL,
    "email" "text",
    "access_token" "text",
    "refresh_token" "text" NOT NULL,
    "expiry_date" timestamp with time zone,
    "scopes" "text"[],
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY public.ca_user_calendar_integrations
    ADD CONSTRAINT "user_calendar_integrations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_user_calendar_integrations
    ADD CONSTRAINT "uq_user_calendar_provider" UNIQUE ("user_id", "provider");

CREATE INDEX "idx_user_calendar_integrations_org_id" ON public.ca_user_calendar_integrations USING "btree" ("org_id");

-- Included Foreign Keys (Referenced tables are already created):
ALTER TABLE ONLY public.ca_user_calendar_integrations ADD CONSTRAINT "fk_user_calendar_integrations_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- Note: 'ca_user_calendar_integrations' user_id does not have a foreign key defined in schema.sql.

-- Deferred Triggers (Shared functions may not exist yet):
-- Note: 'ca_user_calendar_integrations' does not have a trigger defined in schema.sql.
