CREATE TABLE IF NOT EXISTS public.ca_candidate_projects (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "technologies" character varying(500),
    "duration" character varying(150),
    "role" character varying(255),
    "project_url" character varying(500),
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_cand_projects_title_not_empty" CHECK ((TRIM(BOTH FROM "title") <> ''::"text"))
);

ALTER TABLE ONLY public.ca_candidate_projects
    ADD CONSTRAINT "candidate_projects_pkey" PRIMARY KEY ("id");

CREATE INDEX "idx_cand_projects_cand" ON public.ca_candidate_projects USING "btree" ("candidate_id");

CREATE INDEX "idx_cand_projects_deleted" ON public.ca_candidate_projects USING "btree" ("deleted_at");

CREATE INDEX "idx_cand_projects_is_deleted" ON public.ca_candidate_projects USING "btree" ("is_deleted");

CREATE INDEX "idx_cand_projects_title" ON public.ca_candidate_projects USING "btree" ("title");

CREATE INDEX "idx_candidate_projects_org_id" ON public.ca_candidate_projects USING "btree" ("org_id");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_candidate_projects ADD CONSTRAINT "fk_cand_projects_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;
-- ALTER TABLE ONLY public.ca_candidate_projects ADD CONSTRAINT "fk_cand_projects_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_candidate_projects ADD CONSTRAINT "fk_cand_projects_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_candidate_projects ADD CONSTRAINT "fk_candidate_projects_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Triggers (Shared function trigger_set_updated_at may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_cand_projects_updated_at" BEFORE UPDATE ON "public"."ca_candidate_projects" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
