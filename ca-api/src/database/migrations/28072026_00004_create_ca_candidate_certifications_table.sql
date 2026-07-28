CREATE TABLE IF NOT EXISTS public.ca_candidate_certifications (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "certification_name" character varying(255) NOT NULL,
    "issuer" character varying(255),
    "issued_on" "date",
    "expiry_on" "date",
    "does_not_expire" boolean DEFAULT false NOT NULL,
    "credential_id" character varying(150),
    "credential_url" character varying(500),
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_cand_certs_dates" CHECK ((("issued_on" IS NULL) OR ("expiry_on" IS NULL) OR ("expiry_on" >= "issued_on"))),
    CONSTRAINT "chk_cand_certs_name_not_empty" CHECK ((TRIM(BOTH FROM "certification_name") <> ''::"text"))
);

ALTER TABLE ONLY public.ca_candidate_certifications
    ADD CONSTRAINT "candidate_certifications_pkey" PRIMARY KEY ("id");

CREATE INDEX "idx_cand_certs_cand" ON public.ca_candidate_certifications USING "btree" ("candidate_id");

CREATE INDEX "idx_cand_certs_deleted" ON public.ca_candidate_certifications USING "btree" ("deleted_at");

CREATE INDEX "idx_cand_certs_does_not_expire" ON public.ca_candidate_certifications USING "btree" ("does_not_expire");

CREATE INDEX "idx_cand_certs_is_deleted" ON public.ca_candidate_certifications USING "btree" ("is_deleted");

CREATE INDEX "idx_cand_certs_issuer" ON public.ca_candidate_certifications USING "btree" ("issuer");

CREATE INDEX "idx_cand_certs_name" ON public.ca_candidate_certifications USING "btree" ("certification_name");

CREATE INDEX "idx_candidate_certifications_org_id" ON public.ca_candidate_certifications USING "btree" ("org_id");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_candidate_certifications ADD CONSTRAINT "fk_cand_certs_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;
-- ALTER TABLE ONLY public.ca_candidate_certifications ADD CONSTRAINT "fk_cand_certs_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_candidate_certifications ADD CONSTRAINT "fk_cand_certs_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_candidate_certifications ADD CONSTRAINT "fk_candidate_certifications_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Triggers (Shared function trigger_set_updated_at may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_cand_certs_updated_at" BEFORE UPDATE ON "public"."ca_candidate_certifications" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
