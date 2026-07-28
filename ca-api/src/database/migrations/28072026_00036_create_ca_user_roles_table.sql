CREATE TABLE IF NOT EXISTS public.ca_user_roles (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY public.ca_user_roles
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_user_roles
    ADD CONSTRAINT "uq_user_roles_mapping" UNIQUE ("user_id", "role_id");

CREATE UNIQUE INDEX "idx_user_roles_primary" ON public.ca_user_roles USING "btree" ("user_id") WHERE ("is_primary" = true);
CREATE INDEX "idx_user_roles_role_id" ON public.ca_user_roles USING "btree" ("role_id");
CREATE UNIQUE INDEX "idx_user_roles_user_role_composite" ON public.ca_user_roles USING "btree" ("user_id", "role_id");

-- Included Foreign Keys (Referenced tables are already created):
ALTER TABLE ONLY public.ca_user_roles ADD CONSTRAINT "fk_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "public"."ca_roles"("id") ON DELETE CASCADE;

-- Deferred Foreign Keys (Referenced tables not guaranteed to be created earlier):
-- ALTER TABLE ONLY public.ca_user_roles ADD CONSTRAINT "fk_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "public"."ca_users"("id") ON DELETE CASCADE;

-- Deferred Triggers (Shared functions may not exist yet):
-- Note: 'ca_user_roles' does not have a trigger defined in schema.sql.
