CREATE TABLE IF NOT EXISTS public.ca_addresses (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "address_type" character varying(50) NOT NULL,
    "line1" character varying(255) NOT NULL,
    "line2" character varying(255),
    "landmark" character varying(255),
    "city" character varying(100),
    "state" character varying(100),
    "country" character varying(100),
    "postal_code" character varying(20),
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone
);

ALTER TABLE ONLY public.ca_addresses
    ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");

CREATE INDEX "idx_addresses_deleted_at" ON public.ca_addresses USING "btree" ("deleted_at");

CREATE INDEX "idx_addresses_entity" ON public.ca_addresses USING "btree" ("entity_type", "entity_id");

CREATE INDEX "idx_addresses_entity_type" ON public.ca_addresses USING "btree" ("entity_type", "entity_id", "address_type");

CREATE INDEX "idx_addresses_is_deleted" ON public.ca_addresses USING "btree" ("is_deleted");

CREATE INDEX "idx_addresses_org_id" ON public.ca_addresses USING "btree" ("org_id");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_addresses ADD CONSTRAINT "fk_addresses_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_addresses ADD CONSTRAINT "fk_addresses_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
-- ALTER TABLE ONLY public.ca_addresses ADD CONSTRAINT "fk_addresses_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;

-- Deferred Triggers (Shared function trigger_set_updated_at may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_addresses_updated_at" BEFORE UPDATE ON "public"."ca_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
