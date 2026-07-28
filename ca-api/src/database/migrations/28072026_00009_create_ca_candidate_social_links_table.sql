CREATE TABLE IF NOT EXISTS public.ca_candidate_social_links (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "link_type" character varying(50) NOT NULL,
    "url" character varying(1000) NOT NULL,
    "display_label" character varying(150),
    "is_primary" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_cand_social_type" CHECK ((("link_type")::"text" = ANY ((ARRAY['linkedin'::character varying, 'github'::character varying, 'portfolio'::character varying, 'website'::character varying, 'other'::character varying])::"text"[]))),
    CONSTRAINT "chk_cand_social_url_not_empty" CHECK ((TRIM(BOTH FROM "url") <> ''::"text"))
);

ALTER TABLE ONLY public.ca_candidate_social_links
    ADD CONSTRAINT "candidate_social_links_pkey" PRIMARY KEY ("id");

CREATE INDEX "idx_cand_social_cand" ON public.ca_candidate_social_links USING "btree" ("candidate_id");

CREATE INDEX "idx_cand_social_cand_type" ON public.ca_candidate_social_links USING "btree" ("candidate_id", "link_type");

CREATE INDEX "idx_cand_social_deleted" ON public.ca_candidate_social_links USING "btree" ("deleted_at");

CREATE INDEX "idx_cand_social_is_deleted" ON public.ca_candidate_social_links USING "btree" ("is_deleted");

CREATE INDEX "idx_candidate_social_links_org_id" ON public.ca_candidate_social_links USING "btree" ("org_id");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_candidate_social_links ADD CONSTRAINT "fk_cand_social_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;
-- ALTER TABLE ONLY public.ca_candidate_social_links ADD CONSTRAINT "fk_cand_social_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_candidate_social_links ADD CONSTRAINT "fk_cand_social_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_candidate_social_links ADD CONSTRAINT "fk_candidate_social_links_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Triggers (Shared function trigger_set_updated_at may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_cand_social_updated_at" BEFORE UPDATE ON "public"."ca_candidate_social_links" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
