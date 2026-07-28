CREATE TABLE IF NOT EXISTS public.ca_duplicate_matches (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "incoming_candidate_id" "uuid",
    "matched_candidate_id" "uuid" NOT NULL,
    "candidate_submission_ref" character varying(100),
    "confidence_score" numeric(5,4) NOT NULL,
    "match_level" character varying(30) NOT NULL,
    "matching_signals" "jsonb" NOT NULL,
    "status" character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    "override_reason" "text",
    "review_notes" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_dup_confidence" CHECK ((("confidence_score" >= (0)::numeric) AND ("confidence_score" <= (1)::numeric))),
    CONSTRAINT "chk_dup_match_level" CHECK ((("match_level")::"text" = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying])::"text"[]))),
    CONSTRAINT "chk_dup_status" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'blocked'::character varying, 'override_requested'::character varying, 'override_approved'::character varying, 'override_rejected'::character varying, 'linked_existing'::character varying, 'resolved'::character varying])::"text"[])))
);

ALTER TABLE ONLY public.ca_duplicate_matches
    ADD CONSTRAINT "duplicate_matches_pkey" PRIMARY KEY ("id");

CREATE INDEX "idx_dup_created_desc" ON public.ca_duplicate_matches USING "btree" ("created_at" DESC);

CREATE INDEX "idx_dup_incoming_cand" ON public.ca_duplicate_matches USING "btree" ("incoming_candidate_id");

CREATE INDEX "idx_dup_match_level" ON public.ca_duplicate_matches USING "btree" ("match_level");

CREATE INDEX "idx_dup_matched_cand" ON public.ca_duplicate_matches USING "btree" ("matched_candidate_id");

CREATE INDEX "idx_dup_reviewed_by" ON public.ca_duplicate_matches USING "btree" ("reviewed_by");

CREATE INDEX "idx_dup_signals_gin" ON public.ca_duplicate_matches USING "gin" ("matching_signals");

CREATE INDEX "idx_dup_status" ON public.ca_duplicate_matches USING "btree" ("status");

CREATE INDEX "idx_duplicate_matches_org_id" ON public.ca_duplicate_matches USING "btree" ("org_id");

-- Included Foreign Keys (Referenced tables already exist):
ALTER TABLE ONLY public.ca_duplicate_matches ADD CONSTRAINT "fk_dup_incoming_cand" FOREIGN KEY ("incoming_candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE SET NULL;
ALTER TABLE ONLY public.ca_duplicate_matches ADD CONSTRAINT "fk_dup_matched_cand" FOREIGN KEY ("matched_candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE RESTRICT;

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_duplicate_matches ADD CONSTRAINT "fk_dup_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_duplicate_matches ADD CONSTRAINT "fk_duplicate_matches_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Triggers (Shared function trigger_set_updated_at may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_dup_matches_updated_at" BEFORE UPDATE ON "public"."ca_duplicate_matches" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
