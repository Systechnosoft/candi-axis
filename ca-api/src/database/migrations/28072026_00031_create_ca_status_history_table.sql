CREATE TABLE IF NOT EXISTS public.ca_status_history (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "from_status" character varying(50),
    "to_status" character varying(50) NOT NULL,
    "reason" "text",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_status_history_entity_not_empty" CHECK ((TRIM(BOTH FROM "entity_type") <> ''::"text")),
    CONSTRAINT "chk_status_history_to_not_empty" CHECK ((TRIM(BOTH FROM "to_status") <> ''::"text"))
);

ALTER TABLE ONLY public.ca_status_history
    ADD CONSTRAINT "status_history_pkey" PRIMARY KEY ("id");

CREATE INDEX "idx_status_history_changed_by" ON public.ca_status_history USING "btree" ("changed_by");
CREATE INDEX "idx_status_history_entity_time" ON public.ca_status_history USING "btree" ("entity_type", "entity_id", "changed_at" DESC);
CREATE INDEX "idx_status_history_org_id" ON public.ca_status_history USING "btree" ("org_id");
CREATE INDEX "idx_status_history_to_status" ON public.ca_status_history USING "btree" ("to_status");

-- Included Foreign Keys (Referenced tables are already created):
ALTER TABLE ONLY public.ca_status_history ADD CONSTRAINT "fk_status_history_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_status_history ADD CONSTRAINT "fk_status_history_changed_by" FOREIGN KEY ("changed_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
