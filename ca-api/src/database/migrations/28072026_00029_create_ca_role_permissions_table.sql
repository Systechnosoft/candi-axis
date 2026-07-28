CREATE TABLE IF NOT EXISTS public.ca_role_permissions (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_id" "uuid" NOT NULL,
    "module_id" "uuid" NOT NULL,
    "can_read" boolean DEFAULT false NOT NULL,
    "can_create" boolean DEFAULT false NOT NULL,
    "can_update" boolean DEFAULT false NOT NULL,
    "can_delete" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY public.ca_role_permissions
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_role_permissions
    ADD CONSTRAINT "uq_role_module_permissions" UNIQUE ("role_id", "module_id");

CREATE UNIQUE INDEX "idx_rp_role_module" ON public.ca_role_permissions USING "btree" ("role_id", "module_id");

-- Included Foreign Keys (Referenced tables are already created):
ALTER TABLE ONLY public.ca_role_permissions ADD CONSTRAINT "role_permissions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."ca_modules"("id") ON DELETE CASCADE;

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_role_permissions ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."ca_roles"("id") ON DELETE CASCADE;

-- Deferred Triggers (Shared functions may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_role_permissions_updated_at" BEFORE UPDATE ON "public"."ca_role_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
