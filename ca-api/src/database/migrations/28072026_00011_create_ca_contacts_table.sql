CREATE TABLE IF NOT EXISTS public.ca_contacts (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "contact_type" character varying(50) NOT NULL,
    "contact_value" character varying(320) NOT NULL,
    "contact_value_normalized" character varying(320),
    "country_code" character varying(10),
    "label" character varying(100),
    "is_primary" boolean DEFAULT false NOT NULL,
    "is_verified" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "chk_contacts_type" CHECK ((("contact_type")::"text" = ANY ((ARRAY['phone'::character varying, 'email'::character varying, 'whatsapp'::character varying])::"text"[]))),
    CONSTRAINT "chk_contacts_type_not_empty" CHECK ((TRIM(BOTH FROM "contact_type") <> ''::"text")),
    CONSTRAINT "chk_contacts_value_not_empty" CHECK ((TRIM(BOTH FROM "contact_value") <> ''::"text"))
);

ALTER TABLE ONLY public.ca_contacts
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");

CREATE INDEX "idx_contacts_deleted_at" ON public.ca_contacts USING "btree" ("deleted_at");

CREATE INDEX "idx_contacts_entity" ON public.ca_contacts USING "btree" ("entity_type", "entity_id");

CREATE INDEX "idx_contacts_entity_type" ON public.ca_contacts USING "btree" ("entity_type", "entity_id", "contact_type");

CREATE INDEX "idx_contacts_is_deleted" ON public.ca_contacts USING "btree" ("is_deleted");

CREATE INDEX "idx_contacts_org_id" ON public.ca_contacts USING "btree" ("org_id");

CREATE INDEX "idx_contacts_value_normalized" ON public.ca_contacts USING "btree" ("contact_value_normalized");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_contacts ADD CONSTRAINT "fk_contacts_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_contacts ADD CONSTRAINT "fk_contacts_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
-- ALTER TABLE ONLY public.ca_contacts ADD CONSTRAINT "fk_contacts_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;

-- Deferred Triggers (Shared function trigger_set_updated_at may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_contacts_updated_at" BEFORE UPDATE ON "public"."ca_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
