CREATE TABLE IF NOT EXISTS public.ca_tags (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(150) NOT NULL,
    "normalized_name" character varying(150) NOT NULL,
    "type" character varying(50) NOT NULL,
    "description" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_tags_type" CHECK ((("type")::"text" = ANY ((ARRAY['skill'::character varying, 'domain'::character varying, 'level'::character varying, 'location'::character varying, 'other'::character varying])::"text"[])))
);

ALTER TABLE ONLY public.ca_tags
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_tags
    ADD CONSTRAINT "uq_tags_normalized_type" UNIQUE ("normalized_name", "type");

CREATE INDEX "idx_tags_active" ON public.ca_tags USING "btree" ("active");
CREATE INDEX "idx_tags_deleted_at" ON public.ca_tags USING "btree" ("deleted_at");
CREATE INDEX "idx_tags_is_deleted" ON public.ca_tags USING "btree" ("is_deleted");
CREATE UNIQUE INDEX "idx_tags_normalized_type" ON public.ca_tags USING "btree" ("normalized_name", "type");
CREATE INDEX "idx_tags_org_id" ON public.ca_tags USING "btree" ("org_id");
CREATE INDEX "idx_tags_type" ON public.ca_tags USING "btree" ("type");

-- Included Foreign Keys (Referenced tables are already created):
ALTER TABLE ONLY public.ca_tags ADD CONSTRAINT "fk_tags_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_tags ADD CONSTRAINT "fk_tags_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_tags ADD CONSTRAINT "fk_tags_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;

-- Deferred Triggers (Shared functions may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_tags_updated_at" BEFORE UPDATE ON "public"."ca_tags" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
