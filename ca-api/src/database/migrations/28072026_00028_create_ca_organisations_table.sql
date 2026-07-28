CREATE SEQUENCE IF NOT EXISTS public.org_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE IF NOT EXISTS public.ca_organisations (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_code" character varying(50) DEFAULT ('ORG-'::"text" || "lpad"(("nextval"('"public"."org_code_seq"'::"regclass"))::"text", 3, '0'::"text")) NOT NULL,
    "name" character varying(150) NOT NULL,
    "legal_name" character varying(200),
    "primary_contact_name" character varying(150),
    "primary_email_contact_id" "uuid",
    "primary_phone_contact_id" "uuid",
    "primary_address_id" "uuid",
    "website_url" "text",
    "industry" character varying(100),
    "company_size" character varying(50),
    "allowed_email_domains" "text"[] DEFAULT '{}'::"text"[],
    "status" character varying(30) DEFAULT 'ACTIVE'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "chk_organisations_status" CHECK ((("status")::"text" = ANY ((ARRAY['ACTIVE'::character varying, 'INACTIVE'::character varying, 'SUSPENDED'::character varying, 'DELETED'::character varying])::"text"[])))
);

ALTER TABLE ONLY public.ca_organisations
    ADD CONSTRAINT "organisations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_organisations
    ADD CONSTRAINT "uq_organisations_org_code" UNIQUE ("org_code");

CREATE INDEX "idx_organisations_deleted_at" ON public.ca_organisations USING "btree" ("deleted_at");

CREATE INDEX "idx_organisations_name" ON public.ca_organisations USING "btree" ("name");

CREATE INDEX "idx_organisations_status" ON public.ca_organisations USING "btree" ("status") WHERE ("deleted_at" IS NULL);

-- Included Foreign Keys (Referenced tables are already created):
ALTER TABLE ONLY public.ca_organisations ADD CONSTRAINT "organisations_primary_address_id_fkey" FOREIGN KEY ("primary_address_id") REFERENCES "public"."ca_addresses"("id") ON DELETE SET NULL;
ALTER TABLE ONLY public.ca_organisations ADD CONSTRAINT "organisations_primary_email_contact_id_fkey" FOREIGN KEY ("primary_email_contact_id") REFERENCES "public"."ca_contacts"("id") ON DELETE SET NULL;
ALTER TABLE ONLY public.ca_organisations ADD CONSTRAINT "organisations_primary_phone_contact_id_fkey" FOREIGN KEY ("primary_phone_contact_id") REFERENCES "public"."ca_contacts"("id") ON DELETE SET NULL;
