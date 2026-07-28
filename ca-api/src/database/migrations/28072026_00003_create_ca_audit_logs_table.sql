CREATE TABLE IF NOT EXISTS public.ca_audit_logs (
    "org_id" "uuid",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" character varying(100) NOT NULL,
    "action" character varying(50) NOT NULL,
    "before_json" "jsonb",
    "after_json" "jsonb",
    "changed_by" "uuid",
    "reason_context" "text",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_audit_logs_action_not_empty" CHECK ((TRIM(BOTH FROM "action") <> ''::"text")),
    CONSTRAINT "chk_audit_logs_entity_not_empty" CHECK ((TRIM(BOTH FROM "entity_type") <> ''::"text"))
);

ALTER TABLE ONLY public.ca_audit_logs
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");

CREATE INDEX "idx_audit_logs_after_gin" ON public.ca_audit_logs USING "gin" ("after_json");

CREATE INDEX "idx_audit_logs_before_gin" ON public.ca_audit_logs USING "gin" ("before_json");

CREATE INDEX "idx_audit_logs_changed_at" ON public.ca_audit_logs USING "btree" ("changed_at" DESC);

CREATE INDEX "idx_audit_logs_changed_by" ON public.ca_audit_logs USING "btree" ("changed_by");

CREATE INDEX "idx_audit_logs_entity" ON public.ca_audit_logs USING "btree" ("entity_type", "entity_id");

CREATE INDEX "idx_audit_logs_org_id" ON public.ca_audit_logs USING "btree" ("org_id");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_audit_logs ADD CONSTRAINT "fk_audit_logs_changed_by" FOREIGN KEY ("changed_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_audit_logs ADD CONSTRAINT "fk_audit_logs_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
