CREATE SEQUENCE IF NOT EXISTS public.job_requisition_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE IF NOT EXISTS public.ca_job_requisitions (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) DEFAULT ('REQ-'::"text" || "lpad"(("nextval"('"public"."job_requisition_code_seq"'::"regclass"))::"text", 3, '0'::"text")) NOT NULL,
    "title" character varying(200) NOT NULL,
    "department" character varying(100) NOT NULL,
    "openings_count" integer DEFAULT 1 NOT NULL,
    "priority" character varying(30) DEFAULT 'medium'::character varying NOT NULL,
    "hiring_manager_id" "uuid" NOT NULL,
    "owner_user_id" "uuid",
    "status" character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    "status_reason" "text",
    "opened_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_job_req_openings" CHECK (("openings_count" > 0)),
    CONSTRAINT "chk_job_req_priority" CHECK ((("priority")::"text" = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::"text"[]))),
    CONSTRAINT "chk_job_req_status" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'open'::character varying, 'on_hold'::character varying, 'closed'::character varying])::"text"[])))
);

ALTER TABLE ONLY public.ca_job_requisitions
    ADD CONSTRAINT "job_requisitions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_job_requisitions
    ADD CONSTRAINT "uq_job_req_code" UNIQUE ("code");

CREATE UNIQUE INDEX "idx_job_req_code" ON public.ca_job_requisitions USING "btree" ("code");

CREATE INDEX "idx_job_req_deleted" ON public.ca_job_requisitions USING "btree" ("deleted_at");

CREATE INDEX "idx_job_req_dept" ON public.ca_job_requisitions USING "btree" ("department");

CREATE INDEX "idx_job_req_dept_status" ON public.ca_job_requisitions USING "btree" ("department", "status");

CREATE INDEX "idx_job_req_hm" ON public.ca_job_requisitions USING "btree" ("hiring_manager_id");

CREATE INDEX "idx_job_req_is_deleted" ON public.ca_job_requisitions USING "btree" ("is_deleted");

CREATE INDEX "idx_job_req_owner" ON public.ca_job_requisitions USING "btree" ("owner_user_id");

CREATE INDEX "idx_job_req_priority" ON public.ca_job_requisitions USING "btree" ("priority");

CREATE INDEX "idx_job_req_status" ON public.ca_job_requisitions USING "btree" ("status");

CREATE INDEX "idx_job_req_status_priority" ON public.ca_job_requisitions USING "btree" ("status", "priority");

CREATE INDEX "idx_job_requisitions_org_id" ON public.ca_job_requisitions USING "btree" ("org_id");

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_job_requisitions ADD CONSTRAINT "fk_job_req_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_job_requisitions ADD CONSTRAINT "fk_job_req_hm" FOREIGN KEY ("hiring_manager_id") REFERENCES "public"."ca_users"("id") ON DELETE RESTRICT;
-- ALTER TABLE ONLY public.ca_job_requisitions ADD CONSTRAINT "fk_job_req_owner" FOREIGN KEY ("owner_user_id") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_job_requisitions ADD CONSTRAINT "fk_job_req_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
-- ALTER TABLE ONLY public.ca_job_requisitions ADD CONSTRAINT "fk_job_requisitions_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

-- Deferred Triggers (Shared functions may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_job_req_updated_at" BEFORE UPDATE ON "public"."ca_job_requisitions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
-- CREATE OR REPLACE TRIGGER "trig_protect_job_requisitions_code" BEFORE UPDATE ON "public"."ca_job_requisitions" FOR EACH ROW EXECUTE FUNCTION "public"."protect_code_column"();
