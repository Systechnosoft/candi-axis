CREATE TABLE IF NOT EXISTS public.ca_offers (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "offered_ctc" numeric(12,2) NOT NULL,
    "joining_date" "date",
    "offer_valid_till" "date",
    "status" character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_offers_ctc" CHECK (("offered_ctc" >= (0)::numeric)),
    CONSTRAINT "chk_offers_status" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'sent'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'withdrawn'::character varying])::"text"[])))
);

ALTER TABLE ONLY public.ca_offers
    ADD CONSTRAINT "offers_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_offers
    ADD CONSTRAINT "uq_offers_application" UNIQUE ("application_id");

CREATE UNIQUE INDEX "idx_offers_application_uq" ON public.ca_offers USING "btree" ("application_id");

CREATE INDEX "idx_offers_created_at" ON public.ca_offers USING "btree" ("created_at");

CREATE INDEX "idx_offers_created_by" ON public.ca_offers USING "btree" ("created_by");

CREATE INDEX "idx_offers_deleted_at" ON public.ca_offers USING "btree" ("deleted_at");

CREATE INDEX "idx_offers_is_deleted" ON public.ca_offers USING "btree" ("is_deleted");

CREATE INDEX "idx_offers_joining" ON public.ca_offers USING "btree" ("joining_date");

CREATE INDEX "idx_offers_org_id" ON public.ca_offers USING "btree" ("org_id");

CREATE INDEX "idx_offers_status" ON public.ca_offers USING "btree" ("status");

CREATE INDEX "idx_offers_valid_till" ON public.ca_offers USING "btree" ("offer_valid_till");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_offers ADD CONSTRAINT "fk_offers_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_offers ADD CONSTRAINT "fk_offers_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Triggers (Shared functions may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_offers_updated_at" BEFORE UPDATE ON "public"."ca_offers" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
