CREATE TABLE IF NOT EXISTS public.ca_notes (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "note_type" character varying(30) DEFAULT 'general'::character varying NOT NULL,
    "visibility" character varying(30) DEFAULT 'internal'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "chk_notes_content_not_empty" CHECK ((TRIM(BOTH FROM "content") <> ''::"text")),
    CONSTRAINT "chk_notes_type" CHECK ((("note_type")::"text" = ANY ((ARRAY['general'::character varying, 'screening'::character varying, 'interview'::character varying, 'decision'::character varying])::"text"[]))),
    CONSTRAINT "chk_notes_visibility" CHECK ((("visibility")::"text" = ANY ((ARRAY['internal'::character varying, 'restricted'::character varying])::"text"[])))
);

ALTER TABLE ONLY public.ca_notes
    ADD CONSTRAINT "notes_pkey" PRIMARY KEY ("id");

CREATE INDEX "idx_notes_author" ON public.ca_notes USING "btree" ("author_id");

CREATE INDEX "idx_notes_content_gin" ON public.ca_notes USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));

CREATE INDEX "idx_notes_deleted_at" ON public.ca_notes USING "btree" ("deleted_at");

CREATE INDEX "idx_notes_entity" ON public.ca_notes USING "btree" ("entity_type", "entity_id");

CREATE INDEX "idx_notes_is_deleted" ON public.ca_notes USING "btree" ("is_deleted");

CREATE INDEX "idx_notes_org_id" ON public.ca_notes USING "btree" ("org_id");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_notes ADD CONSTRAINT "fk_notes_author" FOREIGN KEY ("author_id") REFERENCES "public"."ca_users"("id") ON DELETE RESTRICT;
-- ALTER TABLE ONLY public.ca_notes ADD CONSTRAINT "fk_notes_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Triggers (Shared functions may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_notes_updated_at" BEFORE UPDATE ON "public"."ca_notes" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
