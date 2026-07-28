CREATE TABLE IF NOT EXISTS public.ca_entity_tags (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "source" character varying(30) DEFAULT 'manual'::character varying NOT NULL,
    "confidence" numeric(5,4),
    "is_starred" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "chk_entity_tags_confidence" CHECK ((("confidence" IS NULL) OR (("confidence" >= (0)::numeric) AND ("confidence" <= (1)::numeric)))),
    CONSTRAINT "chk_entity_tags_source" CHECK ((("source")::"text" = ANY ((ARRAY['manual'::character varying, 'parser'::character varying, 'ai'::character varying])::"text"[])))
);

ALTER TABLE ONLY public.ca_entity_tags
    ADD CONSTRAINT "entity_tags_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_entity_tags
    ADD CONSTRAINT "uq_entity_tags" UNIQUE ("entity_type", "entity_id", "tag_id", "source");

CREATE INDEX "idx_entity_tags_entity" ON public.ca_entity_tags USING "btree" ("entity_type", "entity_id");

CREATE INDEX "idx_entity_tags_source" ON public.ca_entity_tags USING "btree" ("source");

CREATE INDEX "idx_entity_tags_tag_id" ON public.ca_entity_tags USING "btree" ("tag_id");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_entity_tags ADD CONSTRAINT "fk_entity_tags_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_entity_tags ADD CONSTRAINT "fk_entity_tags_tag" FOREIGN KEY ("tag_id") REFERENCES "public"."ca_tags"("id") ON DELETE CASCADE;
