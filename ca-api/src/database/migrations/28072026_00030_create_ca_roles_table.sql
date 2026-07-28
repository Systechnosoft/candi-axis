CREATE TABLE IF NOT EXISTS public.ca_roles (
    "org_id" "uuid",
    "scope" character varying(30) DEFAULT 'CUSTOMER'::character varying NOT NULL,
    "role_type" character varying(50) DEFAULT 'CUSTOM'::character varying NOT NULL,
    "level" integer DEFAULT 10 NOT NULL,
    "is_system_role" boolean DEFAULT false NOT NULL,
    "is_editable" boolean DEFAULT true NOT NULL,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid",
    "updated_by" "uuid",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "is_system" boolean DEFAULT true NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_roles_code_not_empty" CHECK ((TRIM(BOTH FROM "code") <> ''::"text")),
    CONSTRAINT "chk_roles_name_not_empty" CHECK ((TRIM(BOTH FROM "name") <> ''::"text"))
);

ALTER TABLE ONLY public.ca_roles
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX "idx_roles_code_org" ON public.ca_roles USING "btree" ("org_id", "code") WHERE (("org_id" IS NOT NULL) AND ("deleted_at" IS NULL));

CREATE UNIQUE INDEX "idx_roles_code_platform" ON public.ca_roles USING "btree" ("code") WHERE (("org_id" IS NULL) AND ("deleted_at" IS NULL));

CREATE INDEX "idx_roles_is_active" ON public.ca_roles USING "btree" ("is_active");

CREATE UNIQUE INDEX "idx_roles_name_org" ON public.ca_roles USING "btree" ("org_id", "name") WHERE (("org_id" IS NOT NULL) AND ("deleted_at" IS NULL));

CREATE UNIQUE INDEX "idx_roles_name_platform" ON public.ca_roles USING "btree" ("name") WHERE (("org_id" IS NULL) AND ("deleted_at" IS NULL));

-- Included Foreign Keys (Referenced tables are already created):
ALTER TABLE ONLY public.ca_roles ADD CONSTRAINT "fk_roles_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;

-- Deferred Triggers (Shared functions may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_roles_updated_at" BEFORE UPDATE ON "public"."ca_roles" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
