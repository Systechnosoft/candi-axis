CREATE TABLE IF NOT EXISTS public.ca_modules (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(100) NOT NULL,
    "name" character varying(150) NOT NULL,
    "description" "text",
    "module_group" character varying(100),
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_platform_only" boolean DEFAULT false NOT NULL,
    "is_system" boolean DEFAULT true NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY public.ca_modules
    ADD CONSTRAINT "modules_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY public.ca_modules
    ADD CONSTRAINT "uq_modules_code" UNIQUE ("code");

ALTER TABLE ONLY public.ca_modules
    ADD CONSTRAINT "uq_modules_name" UNIQUE ("name");

CREATE INDEX "idx_modules_active" ON public.ca_modules USING "btree" ("is_active");

CREATE UNIQUE INDEX "idx_modules_code" ON public.ca_modules USING "btree" ("code");

CREATE INDEX "idx_modules_group" ON public.ca_modules USING "btree" ("module_group");

CREATE UNIQUE INDEX "idx_modules_name" ON public.ca_modules USING "btree" ("name");

-- Deferred Triggers (Shared functions may not exist yet):
-- CREATE OR REPLACE TRIGGER "trig_modules_updated_at" BEFORE UPDATE ON "public"."ca_modules" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
