CREATE TABLE IF NOT EXISTS public.ca_users (
    "org_id" "uuid",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(320) NOT NULL,
    "email_normalized" character varying(320) NOT NULL,
    "full_name" character varying(200) NOT NULL,
    "first_name" character varying(100),
    "last_name" character varying(100),
    "phone" character varying(30),
    "phone_normalized" character varying(30),
    "employee_code" character varying(50),
    "designation" character varying(100),
    "department" character varying(100),
    "status" character varying(30) DEFAULT 'active'::character varying NOT NULL,
    "timezone" character varying(100) DEFAULT 'Asia/Kolkata'::character varying NOT NULL,
    "last_login_at" timestamp with time zone,
    "supabase_auth_user_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "role_id" "uuid",
    CONSTRAINT "chk_users_status" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'locked'::character varying, 'invited'::character varying])::"text"[])))
);

ALTER TABLE ONLY public.ca_users
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_users
    ADD CONSTRAINT "uq_users_email_normalized" UNIQUE ("email_normalized");

CREATE INDEX "idx_users_deleted_at" ON public.ca_users USING "btree" ("deleted_at");
CREATE INDEX "idx_users_department" ON public.ca_users USING "btree" ("department");
CREATE UNIQUE INDEX "idx_users_email_normalized" ON public.ca_users USING "btree" ("email_normalized");
CREATE UNIQUE INDEX "idx_users_employee_code" ON public.ca_users USING "btree" ("employee_code") WHERE ("employee_code" IS NOT NULL);
CREATE INDEX "idx_users_full_name" ON public.ca_users USING "btree" ("full_name");
CREATE INDEX "idx_users_is_deleted" ON public.ca_users USING "btree" ("is_deleted");
CREATE INDEX "idx_users_org_id" ON public.ca_users USING "btree" ("org_id");
CREATE INDEX "idx_users_status" ON public.ca_users USING "btree" ("status");
CREATE UNIQUE INDEX "idx_users_supabase_auth_user_id" ON public.ca_users USING "btree" ("supabase_auth_user_id") WHERE ("supabase_auth_user_id" IS NOT NULL);

-- Included Foreign Keys (Referenced tables are already created):
ALTER TABLE ONLY public.ca_users ADD CONSTRAINT "fk_users_org_id" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY public.ca_users ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."ca_roles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY public.ca_users ADD CONSTRAINT "fk_users_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY public.ca_users ADD CONSTRAINT "fk_users_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;

-- Deferred Triggers (Shared functions may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_users_updated_at" BEFORE UPDATE ON "public"."ca_users" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
