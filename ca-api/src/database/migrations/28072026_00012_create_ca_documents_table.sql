CREATE TABLE IF NOT EXISTS public.ca_documents (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "document_type" character varying(50) NOT NULL,
    "original_file_name" character varying(255) NOT NULL,
    "storage_bucket" character varying(100) NOT NULL,
    "storage_key" character varying(500) NOT NULL,
    "mime_type" character varying(100) NOT NULL,
    "file_size_bytes" bigint,
    "file_hash" character varying(128),
    "parsed_text" "text",
    "parsed_json" "jsonb",
    "resume_hash" character varying(128),
    "parser_vendor" character varying(100),
    "parse_status" character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    "parse_error" "text",
    "parsed_at" timestamp with time zone,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "uploaded_by" "uuid",
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "chk_documents_parse_status" CHECK ((("parse_status")::"text" = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'skipped'::character varying])::"text"[]))),
    CONSTRAINT "chk_documents_storage_key_not_empty" CHECK ((TRIM(BOTH FROM "storage_key") <> ''::"text")),
    CONSTRAINT "chk_documents_type_not_empty" CHECK ((TRIM(BOTH FROM "document_type") <> ''::"text"))
);

ALTER TABLE ONLY public.ca_documents
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");

CREATE INDEX "idx_documents_deleted_at" ON public.ca_documents USING "btree" ("deleted_at");

CREATE INDEX "idx_documents_entity_id" ON public.ca_documents USING "btree" ("entity_type", "entity_id");

CREATE INDEX "idx_documents_entity_type_doc" ON public.ca_documents USING "btree" ("entity_type", "entity_id", "document_type");

CREATE INDEX "idx_documents_file_hash" ON public.ca_documents USING "btree" ("file_hash");

CREATE INDEX "idx_documents_is_deleted" ON public.ca_documents USING "btree" ("is_deleted");

CREATE INDEX "idx_documents_org_id" ON public.ca_documents USING "btree" ("org_id");

CREATE INDEX "idx_documents_parse_status" ON public.ca_documents USING "btree" ("parse_status");

CREATE INDEX "idx_documents_parsed_text_gin" ON public.ca_documents USING "gin" ("to_tsvector"('"english"'::"regconfig", "parsed_text"));

CREATE INDEX "idx_documents_resume_hash" ON public.ca_documents USING "btree" ("resume_hash");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_documents ADD CONSTRAINT "fk_documents_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
-- ALTER TABLE ONLY public.ca_documents ADD CONSTRAINT "fk_documents_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;

-- Deferred Triggers (Shared function trigger_set_updated_at may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_documents_updated_at" BEFORE UPDATE ON "public"."ca_documents" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
