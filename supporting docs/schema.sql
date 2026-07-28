


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."protect_code_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF OLD.code IS NOT NULL AND OLD.code IS DISTINCT FROM NEW.code THEN
    RAISE EXCEPTION 'The code column cannot be updated after creation.';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_code_column"() OWNER TO "postgres";


CREATE PROCEDURE "public"."seed_role_permissions"(IN "p_role_id" "uuid", IN "p_role_code" character varying)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Normalize to lowercase for safe matching
  IF LOWER(p_role_code) = 'super_admin' THEN
    FOR rec IN SELECT id FROM public.ca_modules LOOP
      INSERT INTO public.ca_role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete)
      VALUES (p_role_id, rec.id, true, true, true, true)
      ON CONFLICT (role_id, module_id) DO UPDATE
      SET can_read = true, can_create = true, can_update = true, can_delete = true;
    END LOOP;
  ELSIF LOWER(p_role_code) = 'admin' THEN
    FOR rec IN SELECT id, code FROM public.ca_modules LOOP
      IF rec.code <> 'organisations' THEN
        INSERT INTO public.ca_role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete)
        VALUES (p_role_id, rec.id, true, true, true, true)
        ON CONFLICT (role_id, module_id) DO UPDATE
        SET can_read = true, can_create = true, can_update = true, can_delete = true;
      END IF;
    END LOOP;
  ELSIF LOWER(p_role_code) = 'hr_recruiter' OR LOWER(p_role_code) = 'recruiter' THEN
    FOR rec IN SELECT id, code FROM public.ca_modules LOOP
      IF rec.code IN ('dashboard', 'requisitions', 'job_descriptions', 'candidates', 'interviews', 'feedback', 'offers', 'documents', 'tags', 'notifications', 'applications', 'job_postings') THEN
        INSERT INTO public.ca_role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete)
        VALUES (p_role_id, rec.id, true, true, true, false)
        ON CONFLICT (role_id, module_id) DO UPDATE
        SET can_read = true, can_create = true, can_update = true, can_delete = false;
      ELSIF rec.code IN ('users', 'roles', 'audit_logs') THEN
        INSERT INTO public.ca_role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete)
        VALUES (p_role_id, rec.id, true, false, false, false)
        ON CONFLICT (role_id, module_id) DO UPDATE
        SET can_read = true, can_create = false, can_update = false, can_delete = false;
      END IF;
    END LOOP;
  ELSIF LOWER(p_role_code) = 'hiring_manager' THEN
    FOR rec IN SELECT id, code FROM public.ca_modules LOOP
      IF rec.code IN ('dashboard', 'requisitions', 'job_descriptions', 'candidates', 'interviews', 'feedback', 'documents') THEN
        INSERT INTO public.ca_role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete)
        VALUES (p_role_id, rec.id, true, false, false, false)
        ON CONFLICT (role_id, module_id) DO UPDATE
        SET can_read = true, can_create = false, can_update = false, can_delete = false;
      END IF;
    END LOOP;
  END IF;
END;
$$;


ALTER PROCEDURE "public"."seed_role_permissions"(IN "p_role_id" "uuid", IN "p_role_code" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."_migrations" (
    "filename" character varying(255) NOT NULL,
    "applied_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."_migrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_addresses" (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "address_type" character varying(50) NOT NULL,
    "line1" character varying(255) NOT NULL,
    "line2" character varying(255),
    "landmark" character varying(255),
    "city" character varying(100),
    "state" character varying(100),
    "country" character varying(100),
    "postal_code" character varying(20),
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."ca_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_admin_settings" (
    "org_id" "uuid",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "setting_key" character varying(100) NOT NULL,
    "setting_value" "jsonb" NOT NULL,
    "value_type" character varying(30) DEFAULT 'json'::character varying NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    CONSTRAINT "chk_admin_settings_value_type" CHECK ((("value_type")::"text" = ANY ((ARRAY['string'::character varying, 'number'::character varying, 'boolean'::character varying, 'json'::character varying])::"text"[])))
);


ALTER TABLE "public"."ca_admin_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_audit_logs" (
    "org_id" "uuid",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" character varying(100) NOT NULL,
    "action" character varying(50) NOT NULL,
    "before_json" "jsonb",
    "after_json" "jsonb",
    "changed_by" "uuid",
    "reason_context" "text",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_audit_logs_action_not_empty" CHECK ((TRIM(BOTH FROM "action") <> ''::"text")),
    CONSTRAINT "chk_audit_logs_entity_not_empty" CHECK ((TRIM(BOTH FROM "entity_type") <> ''::"text"))
);


ALTER TABLE "public"."ca_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_candidate_certifications" (
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


ALTER TABLE "public"."ca_candidate_certifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_candidate_educations" (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "qualification_level" character varying(50),
    "degree" character varying(150),
    "field_of_study" character varying(150),
    "institution_name" character varying(255),
    "start_year" integer,
    "end_year" integer,
    "grade_or_percentage" character varying(50),
    "is_highest" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_cand_educations_level" CHECK ((("qualification_level" IS NULL) OR (("qualification_level")::"text" = ANY ((ARRAY['secondary'::character varying, 'higher_secondary'::character varying, 'diploma'::character varying, 'bachelor'::character varying, 'master'::character varying, 'doctorate'::character varying, 'other'::character varying])::"text"[])))),
    CONSTRAINT "chk_cand_educations_years" CHECK ((("start_year" IS NULL) OR ("end_year" IS NULL) OR ("end_year" >= "start_year")))
);


ALTER TABLE "public"."ca_candidate_educations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_candidate_employments" (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "company_name" character varying(255) NOT NULL,
    "job_title" character varying(150),
    "employment_type" character varying(50),
    "location" character varying(150),
    "start_date" "date",
    "end_date" "date",
    "is_current" boolean DEFAULT false NOT NULL,
    "duration_months" integer,
    "responsibilities_summary" "text",
    "technologies_used" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_cand_employments_company_not_empty" CHECK ((TRIM(BOTH FROM "company_name") <> ''::"text")),
    CONSTRAINT "chk_cand_employments_dates" CHECK ((("start_date" IS NULL) OR ("end_date" IS NULL) OR ("end_date" >= "start_date"))),
    CONSTRAINT "chk_cand_employments_type" CHECK ((("employment_type" IS NULL) OR (("employment_type")::"text" = ANY ((ARRAY['full_time'::character varying, 'part_time'::character varying, 'contract'::character varying, 'internship'::character varying, 'freelance'::character varying, 'other'::character varying])::"text"[]))))
);


ALTER TABLE "public"."ca_candidate_employments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_candidate_job_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "job_posting_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "stage" character varying(50) DEFAULT 'new'::character varying NOT NULL,
    "sub_stage" character varying(50) DEFAULT NULL::character varying,
    "stage_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."ca_candidate_job_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_candidate_projects" (
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


ALTER TABLE "public"."ca_candidate_projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_candidate_social_links" (
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


ALTER TABLE "public"."ca_candidate_social_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_candidates" (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" character varying(200) NOT NULL,
    "first_name" character varying(100),
    "last_name" character varying(100),
    "email" character varying(320),
    "email_normalized" character varying(320),
    "email_verified" boolean DEFAULT false NOT NULL,
    "phone" character varying(30),
    "phone_normalized" character varying(30),
    "phone_verified" boolean DEFAULT false NOT NULL,
    "location" character varying(150),
    "total_exp_months" integer,
    "relevant_exp_months" integer,
    "current_company" character varying(150),
    "current_designation" character varying(150),
    "notice_period_days" integer,
    "current_ctc" numeric(12,2),
    "expected_ctc" numeric(12,2),
    "revised_expected_ctc" numeric(12,2),
    "secondary_email" character varying(320),
    "secondary_phone" character varying(30),
    "education_summary" character varying(255),
    "profile_summary" "text",
    "source" character varying(50),
    "status" character varying(30) DEFAULT 'active'::character varying NOT NULL,
    "last_resume_uploaded_at" timestamp with time zone,
    "profile_score" integer,
    "gap_details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_candidates_notice_period" CHECK ((("notice_period_days" IS NULL) OR ("notice_period_days" >= 0))),
    CONSTRAINT "chk_candidates_relevant_exp" CHECK ((("relevant_exp_months" IS NULL) OR ("relevant_exp_months" >= 0))),
    CONSTRAINT "chk_candidates_source" CHECK ((("source" IS NULL) OR (("source")::"text" = ANY ((ARRAY['resume_upload'::character varying, 'manual'::character varying, 'referral'::character varying, 'consultant'::character varying, 'job_board'::character varying, 'other'::character varying])::"text"[])))),
    CONSTRAINT "chk_candidates_status" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'archived'::character varying, 'blacklisted'::character varying, 'joined_elsewhere'::character varying])::"text"[]))),
    CONSTRAINT "chk_candidates_total_exp" CHECK ((("total_exp_months" IS NULL) OR ("total_exp_months" >= 0)))
);


ALTER TABLE "public"."ca_candidates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_contacts" (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "contact_type" character varying(50) NOT NULL,
    "contact_value" character varying(320) NOT NULL,
    "contact_value_normalized" character varying(320),
    "country_code" character varying(10),
    "label" character varying(100),
    "is_primary" boolean DEFAULT false NOT NULL,
    "is_verified" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "chk_contacts_type" CHECK ((("contact_type")::"text" = ANY ((ARRAY['phone'::character varying, 'email'::character varying, 'whatsapp'::character varying])::"text"[]))),
    CONSTRAINT "chk_contacts_type_not_empty" CHECK ((TRIM(BOTH FROM "contact_type") <> ''::"text")),
    CONSTRAINT "chk_contacts_value_not_empty" CHECK ((TRIM(BOTH FROM "contact_value") <> ''::"text"))
);


ALTER TABLE "public"."ca_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_documents" (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "document_type" character varying(50) NOT NULL,
    "original_file_name" character varying(255) NOT NULL,
    "storage_bucket" character varying(100) NOT NULL,
    "storage_key" character varying(500) NOT NULL,
    "mime_type" character varying(100) NOT NULL,
    "file_size_bytes" bigint,
    "file_hash" character varying(128),
    "parsed_text" "text",
    "parsed_json" "jsonb",
    "resume_hash" character varying(128),
    "parser_vendor" character varying(100),
    "parse_status" character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    "parse_error" "text",
    "parsed_at" timestamp with time zone,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "uploaded_by" "uuid",
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "chk_documents_parse_status" CHECK ((("parse_status")::"text" = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'skipped'::character varying])::"text"[]))),
    CONSTRAINT "chk_documents_storage_key_not_empty" CHECK ((TRIM(BOTH FROM "storage_key") <> ''::"text")),
    CONSTRAINT "chk_documents_type_not_empty" CHECK ((TRIM(BOTH FROM "document_type") <> ''::"text"))
);


ALTER TABLE "public"."ca_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_duplicate_matches" (
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


ALTER TABLE "public"."ca_duplicate_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_entity_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "source" character varying(30) DEFAULT 'manual'::character varying NOT NULL,
    "confidence" numeric(5,4),
    "is_starred" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "chk_entity_tags_confidence" CHECK ((("confidence" IS NULL) OR (("confidence" >= (0)::numeric) AND ("confidence" <= (1)::numeric)))),
    CONSTRAINT "chk_entity_tags_source" CHECK ((("source")::"text" = ANY ((ARRAY['manual'::character varying, 'parser'::character varying, 'ai'::character varying])::"text"[])))
);


ALTER TABLE "public"."ca_entity_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_feedback_submissions" (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feedback_task_id" "uuid" NOT NULL,
    "interview_id" "uuid" NOT NULL,
    "interviewer_user_id" "uuid" NOT NULL,
    "tech_rating" numeric(4,2),
    "comms_rating" numeric(4,2),
    "problem_solving_rating" numeric(4,2),
    "culture_fit_rating" numeric(4,2),
    "overall_rating" numeric(4,2),
    "recommendation" character varying(30) NOT NULL,
    "strengths" "text",
    "risks" "text",
    "notes" "text",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_feedback_sub_comms_rating" CHECK ((("comms_rating" IS NULL) OR (("comms_rating" >= (0)::numeric) AND ("comms_rating" <= (5)::numeric)))),
    CONSTRAINT "chk_feedback_sub_culture_rating" CHECK ((("culture_fit_rating" IS NULL) OR (("culture_fit_rating" >= (0)::numeric) AND ("culture_fit_rating" <= (5)::numeric)))),
    CONSTRAINT "chk_feedback_sub_overall_rating" CHECK ((("overall_rating" IS NULL) OR (("overall_rating" >= (0)::numeric) AND ("overall_rating" <= (5)::numeric)))),
    CONSTRAINT "chk_feedback_sub_ps_rating" CHECK ((("problem_solving_rating" IS NULL) OR (("problem_solving_rating" >= (0)::numeric) AND ("problem_solving_rating" <= (5)::numeric)))),
    CONSTRAINT "chk_feedback_sub_recommendation" CHECK ((("recommendation")::"text" = ANY ((ARRAY['strong_yes'::character varying, 'yes'::character varying, 'maybe'::character varying, 'no'::character varying, 'strong_no'::character varying])::"text"[]))),
    CONSTRAINT "chk_feedback_sub_tech_rating" CHECK ((("tech_rating" IS NULL) OR (("tech_rating" >= (0)::numeric) AND ("tech_rating" <= (5)::numeric))))
);


ALTER TABLE "public"."ca_feedback_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_feedback_tasks" (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "interview_id" "uuid" NOT NULL,
    "interviewer_user_id" "uuid" NOT NULL,
    "due_at" timestamp with time zone NOT NULL,
    "status" character varying(30) DEFAULT 'open'::character varying NOT NULL,
    "reminders_sent_count" integer DEFAULT 0 NOT NULL,
    "last_reminder_at" timestamp with time zone,
    "submitted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_feedback_task_reminders" CHECK (("reminders_sent_count" >= 0)),
    CONSTRAINT "chk_feedback_task_status" CHECK ((("status")::"text" = ANY ((ARRAY['open'::character varying, 'submitted'::character varying, 'overdue'::character varying])::"text"[])))
);


ALTER TABLE "public"."ca_feedback_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_interview_assignments" (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "interview_id" "uuid" NOT NULL,
    "interviewer_user_id" "uuid" NOT NULL,
    "required_feedback" boolean DEFAULT true NOT NULL,
    "assignment_status" character varying(30) DEFAULT 'invited'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_assignment_status" CHECK ((("assignment_status")::"text" = ANY ((ARRAY['invited'::character varying, 'accepted'::character varying, 'declined'::character varying])::"text"[])))
);


ALTER TABLE "public"."ca_interview_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_interview_provider_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "provider" character varying(50) NOT NULL,
    "display_name" character varying(100) NOT NULL,
    "auth_mode" character varying(50) NOT NULL,
    "config_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "encrypted_credentials_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_test_status" character varying(50),
    "last_test_message" "text",
    "last_tested_at" timestamp with time zone
);


ALTER TABLE "public"."ca_interview_provider_configurations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_interviews" (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "round_no" integer NOT NULL,
    "round_type" character varying(50) NOT NULL,
    "scheduled_start_utc" timestamp with time zone,
    "duration_mins" integer DEFAULT 60 NOT NULL,
    "mode" character varying(30) DEFAULT 'online'::character varying NOT NULL,
    "location" character varying(255),
    "meeting_link" character varying(1000),
    "status" character varying(30) DEFAULT 'scheduled'::character varying NOT NULL,
    "outlook_event_id" character varying(255),
    "outlook_status" character varying(30),
    "reschedule_reason" "text",
    "cancellation_reason" "text",
    "completed_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "meeting_provider" character varying(50),
    "external_calendar_event_id" "text",
    "calendar_event_link" "text",
    "calendar_sync_status" character varying(50) DEFAULT 'NOT_CONNECTED'::character varying NOT NULL,
    "calendar_sync_error" "text",
    "invitation_sent_at" timestamp with time zone,
    "meeting_created_by" "uuid",
    "meeting_created_at" timestamp with time zone,
    CONSTRAINT "chk_interviews_duration" CHECK (("duration_mins" > 0)),
    CONSTRAINT "chk_interviews_mode" CHECK ((("mode")::"text" = ANY ((ARRAY['online'::character varying, 'offline'::character varying])::"text"[]))),
    CONSTRAINT "chk_interviews_outlook" CHECK ((("outlook_status" IS NULL) OR (("outlook_status")::"text" = ANY ((ARRAY['pending'::character varying, 'created'::character varying, 'updated'::character varying, 'cancelled'::character varying, 'failed'::character varying])::"text"[])))),
    CONSTRAINT "chk_interviews_round" CHECK (("round_no" > 0)),
    CONSTRAINT "chk_interviews_status" CHECK ((("status")::"text" = ANY ((ARRAY['scheduled'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'no_show'::character varying])::"text"[]))),
    CONSTRAINT "chk_interviews_type" CHECK ((("round_type")::"text" = ANY ((ARRAY['screening'::character varying, 'tech1'::character varying, 'tech2'::character varying, 'manager'::character varying, 'hr'::character varying, 'other'::character varying])::"text"[])))
);


ALTER TABLE "public"."ca_interviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_job_candidate_matches" (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "rating" double precision NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "deleted_at" timestamp with time zone,
    "last_processed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ca_job_candidate_matches" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."job_description_code_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."job_description_code_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_job_descriptions" (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requisition_id" "uuid" NOT NULL,
    "title" character varying(200) NOT NULL,
    "code" character varying(50) DEFAULT ('JD-'::"text" || "lpad"(("nextval"('"public"."job_description_code_seq"'::"regclass"))::"text", 3, '0'::"text")) NOT NULL,
    "location" character varying(150),
    "work_mode" character varying(30),
    "employment_type" character varying(30),
    "exp_min_months" integer,
    "exp_max_months" integer,
    "must_have_text" "text",
    "nice_to_have_text" "text",
    "job_summary" "text",
    "responsibilities_text" "text",
    "status" character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    "owner_user_id" "uuid",
    "published_internal_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_jd_employment_type" CHECK ((("employment_type" IS NULL) OR (("employment_type")::"text" = ANY ((ARRAY['full_time'::character varying, 'part_time'::character varying, 'contract'::character varying, 'internship'::character varying])::"text"[])))),
    CONSTRAINT "chk_jd_exp_range" CHECK ((("exp_min_months" IS NULL) OR ("exp_max_months" IS NULL) OR ("exp_max_months" >= "exp_min_months"))),
    CONSTRAINT "chk_jd_status" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'open'::character varying, 'on_hold'::character varying, 'closed'::character varying])::"text"[]))),
    CONSTRAINT "chk_jd_work_mode" CHECK ((("work_mode" IS NULL) OR (("work_mode")::"text" = ANY ((ARRAY['onsite'::character varying, 'remote'::character varying, 'hybrid'::character varying])::"text"[]))))
);


ALTER TABLE "public"."ca_job_descriptions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."job_posting_code_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."job_posting_code_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_job_postings" (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) DEFAULT ('JP-'::"text" || "lpad"(("nextval"('"public"."job_posting_code_seq"'::"regclass"))::"text", 3, '0'::"text")) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "jd_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "hr_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "interviewer_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."ca_job_postings" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."job_requisition_code_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."job_requisition_code_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_job_requisitions" (
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


ALTER TABLE "public"."ca_job_requisitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_modules" (
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


ALTER TABLE "public"."ca_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_notes" (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "note_type" character varying(30) DEFAULT 'general'::character varying NOT NULL,
    "visibility" character varying(30) DEFAULT 'internal'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "chk_notes_content_not_empty" CHECK ((TRIM(BOTH FROM "content") <> ''::"text")),
    CONSTRAINT "chk_notes_type" CHECK ((("note_type")::"text" = ANY ((ARRAY['general'::character varying, 'screening'::character varying, 'interview'::character varying, 'decision'::character varying])::"text"[]))),
    CONSTRAINT "chk_notes_visibility" CHECK ((("visibility")::"text" = ANY ((ARRAY['internal'::character varying, 'restricted'::character varying])::"text"[])))
);


ALTER TABLE "public"."ca_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_notifications" (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "channel" character varying(30) NOT NULL,
    "category" character varying(50) NOT NULL,
    "subject" character varying(255),
    "content" "jsonb" NOT NULL,
    "status" character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "read_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "related_entity_type" character varying(50),
    "related_entity_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_notifications_channel" CHECK ((("channel")::"text" = ANY ((ARRAY['in_app'::character varying, 'email'::character varying])::"text"[]))),
    CONSTRAINT "chk_notifications_status" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'failed'::character varying, 'read'::character varying])::"text"[])))
);


ALTER TABLE "public"."ca_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_offers" (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "offered_ctc" numeric(12,2) NOT NULL,
    "joining_date" "date",
    "offer_valid_till" "date",
    "status" character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_offers_ctc" CHECK (("offered_ctc" >= (0)::numeric)),
    CONSTRAINT "chk_offers_status" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'sent'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'withdrawn'::character varying])::"text"[])))
);


ALTER TABLE "public"."ca_offers" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."org_code_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."org_code_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_organisations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_code" character varying(50) DEFAULT ('ORG-'::"text" || "lpad"(("nextval"('"public"."org_code_seq"'::"regclass"))::"text", 3, '0'::"text")) NOT NULL,
    "name" character varying(150) NOT NULL,
    "legal_name" character varying(200),
    "primary_contact_name" character varying(150),
    "primary_email_contact_id" "uuid",
    "primary_phone_contact_id" "uuid",
    "primary_address_id" "uuid",
    "website_url" "text",
    "industry" character varying(100),
    "company_size" character varying(50),
    "allowed_email_domains" "text"[] DEFAULT '{}'::"text"[],
    "status" character varying(30) DEFAULT 'ACTIVE'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "chk_organisations_status" CHECK ((("status")::"text" = ANY ((ARRAY['ACTIVE'::character varying, 'INACTIVE'::character varying, 'SUSPENDED'::character varying, 'DELETED'::character varying])::"text"[])))
);


ALTER TABLE "public"."ca_organisations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_role_permissions" (
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


ALTER TABLE "public"."ca_role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_roles" (
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


ALTER TABLE "public"."ca_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_status_history" (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "from_status" character varying(50),
    "to_status" character varying(50) NOT NULL,
    "reason" "text",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_status_history_entity_not_empty" CHECK ((TRIM(BOTH FROM "entity_type") <> ''::"text")),
    CONSTRAINT "chk_status_history_to_not_empty" CHECK ((TRIM(BOTH FROM "to_status") <> ''::"text"))
);


ALTER TABLE "public"."ca_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_tags" (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(150) NOT NULL,
    "normalized_name" character varying(150) NOT NULL,
    "type" character varying(50) NOT NULL,
    "description" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_tags_type" CHECK ((("type")::"text" = ANY ((ARRAY['skill'::character varying, 'domain'::character varying, 'level'::character varying, 'location'::character varying, 'other'::character varying])::"text"[])))
);


ALTER TABLE "public"."ca_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_tasks" (
    "org_id" "uuid" NOT NULL,
    "task_id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "assignee" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "assigned_on" timestamp with time zone DEFAULT "now"() NOT NULL,
    "jd_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "application_id" "uuid" NOT NULL,
    "jobposting_id" "uuid" NOT NULL,
    "submitted_on" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "status" character varying(30) DEFAULT 'new'::character varying NOT NULL,
    "submitted_by" "uuid",
    "feedback_action" character varying(30),
    "feedback_reason" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "task_code" character varying(30),
    "feedback_submission_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ca_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_user_calendar_integrations" (
    "org_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" character varying(50) DEFAULT 'GOOGLE'::character varying NOT NULL,
    "email" "text",
    "access_token" "text",
    "refresh_token" "text" NOT NULL,
    "expiry_date" timestamp with time zone,
    "scopes" "text"[],
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ca_user_calendar_integrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_user_meeting_integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" character varying(50) NOT NULL,
    "provider_account_email" character varying(150),
    "provider_account_id" character varying(100),
    "encrypted_access_token" "text",
    "encrypted_refresh_token" "text" NOT NULL,
    "token_expiry" timestamp with time zone,
    "scopes" "text"[] DEFAULT '{}'::"text"[],
    "is_active" boolean DEFAULT true,
    "connected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "disconnected_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ca_user_meeting_integrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ca_user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_users" (
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


ALTER TABLE "public"."ca_users" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."tasks_task_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."tasks_task_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tasks_task_id_seq" OWNED BY "public"."ca_tasks"."task_id";



ALTER TABLE ONLY "public"."ca_tasks" ALTER COLUMN "task_id" SET DEFAULT "nextval"('"public"."tasks_task_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."_migrations"
    ADD CONSTRAINT "_migrations_pkey" PRIMARY KEY ("filename");



ALTER TABLE ONLY "public"."ca_addresses"
    ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_admin_settings"
    ADD CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_candidate_certifications"
    ADD CONSTRAINT "candidate_certifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_candidate_educations"
    ADD CONSTRAINT "candidate_educations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_candidate_employments"
    ADD CONSTRAINT "candidate_employments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_candidate_job_stages"
    ADD CONSTRAINT "candidate_job_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_candidate_projects"
    ADD CONSTRAINT "candidate_projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_candidate_social_links"
    ADD CONSTRAINT "candidate_social_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_candidates"
    ADD CONSTRAINT "candidates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_duplicate_matches"
    ADD CONSTRAINT "duplicate_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_entity_tags"
    ADD CONSTRAINT "entity_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_feedback_submissions"
    ADD CONSTRAINT "feedback_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_feedback_tasks"
    ADD CONSTRAINT "feedback_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_interview_assignments"
    ADD CONSTRAINT "interview_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_interview_provider_configurations"
    ADD CONSTRAINT "interview_provider_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_interviews"
    ADD CONSTRAINT "interviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_job_candidate_matches"
    ADD CONSTRAINT "job_candidate_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_job_descriptions"
    ADD CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_job_postings"
    ADD CONSTRAINT "job_postings_jd_id_key" UNIQUE ("jd_id");



ALTER TABLE ONLY "public"."ca_job_postings"
    ADD CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_job_requisitions"
    ADD CONSTRAINT "job_requisitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_modules"
    ADD CONSTRAINT "modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_notes"
    ADD CONSTRAINT "notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_offers"
    ADD CONSTRAINT "offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_organisations"
    ADD CONSTRAINT "organisations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_status_history"
    ADD CONSTRAINT "status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("task_id");



ALTER TABLE ONLY "public"."ca_tasks"
    ADD CONSTRAINT "tasks_task_code_key" UNIQUE ("task_code");



ALTER TABLE ONLY "public"."ca_admin_settings"
    ADD CONSTRAINT "uq_admin_settings_key" UNIQUE ("setting_key");



ALTER TABLE ONLY "public"."ca_interview_assignments"
    ADD CONSTRAINT "uq_assignment_interview_user" UNIQUE ("interview_id", "interviewer_user_id");



ALTER TABLE ONLY "public"."ca_candidate_job_stages"
    ADD CONSTRAINT "uq_candidate_job_stages" UNIQUE ("job_posting_id", "candidate_id");



ALTER TABLE ONLY "public"."ca_entity_tags"
    ADD CONSTRAINT "uq_entity_tags" UNIQUE ("entity_type", "entity_id", "tag_id", "source");



ALTER TABLE ONLY "public"."ca_feedback_submissions"
    ADD CONSTRAINT "uq_feedback_sub_task" UNIQUE ("feedback_task_id");



ALTER TABLE ONLY "public"."ca_feedback_tasks"
    ADD CONSTRAINT "uq_feedback_task_interview_user" UNIQUE ("interview_id", "interviewer_user_id");



ALTER TABLE ONLY "public"."ca_interview_provider_configurations"
    ADD CONSTRAINT "uq_interview_provider_configs" UNIQUE ("provider");



ALTER TABLE ONLY "public"."ca_interviews"
    ADD CONSTRAINT "uq_interviews_app_round" UNIQUE ("application_id", "round_no");



ALTER TABLE ONLY "public"."ca_job_candidate_matches"
    ADD CONSTRAINT "uq_jcm_job_candidate" UNIQUE ("job_id", "candidate_id");



ALTER TABLE ONLY "public"."ca_job_requisitions"
    ADD CONSTRAINT "uq_job_req_code" UNIQUE ("code");



ALTER TABLE ONLY "public"."ca_modules"
    ADD CONSTRAINT "uq_modules_code" UNIQUE ("code");



ALTER TABLE ONLY "public"."ca_modules"
    ADD CONSTRAINT "uq_modules_name" UNIQUE ("name");



ALTER TABLE ONLY "public"."ca_offers"
    ADD CONSTRAINT "uq_offers_application" UNIQUE ("application_id");



ALTER TABLE ONLY "public"."ca_organisations"
    ADD CONSTRAINT "uq_organisations_org_code" UNIQUE ("org_code");



ALTER TABLE ONLY "public"."ca_role_permissions"
    ADD CONSTRAINT "uq_role_module_permissions" UNIQUE ("role_id", "module_id");



ALTER TABLE ONLY "public"."ca_tags"
    ADD CONSTRAINT "uq_tags_normalized_type" UNIQUE ("normalized_name", "type");



ALTER TABLE ONLY "public"."ca_user_calendar_integrations"
    ADD CONSTRAINT "uq_user_calendar_provider" UNIQUE ("user_id", "provider");



ALTER TABLE ONLY "public"."ca_user_meeting_integrations"
    ADD CONSTRAINT "uq_user_meeting_provider" UNIQUE ("user_id", "provider");



ALTER TABLE ONLY "public"."ca_user_roles"
    ADD CONSTRAINT "uq_user_roles_mapping" UNIQUE ("user_id", "role_id");



ALTER TABLE ONLY "public"."ca_users"
    ADD CONSTRAINT "uq_users_email_normalized" UNIQUE ("email_normalized");



ALTER TABLE ONLY "public"."ca_user_calendar_integrations"
    ADD CONSTRAINT "user_calendar_integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_user_meeting_integrations"
    ADD CONSTRAINT "user_meeting_integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_addresses_deleted_at" ON "public"."ca_addresses" USING "btree" ("deleted_at");



CREATE INDEX "idx_addresses_entity" ON "public"."ca_addresses" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_addresses_entity_type" ON "public"."ca_addresses" USING "btree" ("entity_type", "entity_id", "address_type");



CREATE INDEX "idx_addresses_is_deleted" ON "public"."ca_addresses" USING "btree" ("is_deleted");



CREATE INDEX "idx_addresses_org_id" ON "public"."ca_addresses" USING "btree" ("org_id");



CREATE INDEX "idx_admin_settings_active" ON "public"."ca_admin_settings" USING "btree" ("is_active");



CREATE UNIQUE INDEX "idx_admin_settings_key" ON "public"."ca_admin_settings" USING "btree" ("setting_key");



CREATE INDEX "idx_admin_settings_org_id" ON "public"."ca_admin_settings" USING "btree" ("org_id");



CREATE UNIQUE INDEX "idx_assignment_interview_user_uq" ON "public"."ca_interview_assignments" USING "btree" ("interview_id", "interviewer_user_id");



CREATE INDEX "idx_assignment_interviewer" ON "public"."ca_interview_assignments" USING "btree" ("interviewer_user_id");



CREATE INDEX "idx_assignment_status" ON "public"."ca_interview_assignments" USING "btree" ("assignment_status");



CREATE INDEX "idx_audit_logs_after_gin" ON "public"."ca_audit_logs" USING "gin" ("after_json");



CREATE INDEX "idx_audit_logs_before_gin" ON "public"."ca_audit_logs" USING "gin" ("before_json");



CREATE INDEX "idx_audit_logs_changed_at" ON "public"."ca_audit_logs" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_audit_logs_changed_by" ON "public"."ca_audit_logs" USING "btree" ("changed_by");



CREATE INDEX "idx_audit_logs_entity" ON "public"."ca_audit_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_audit_logs_org_id" ON "public"."ca_audit_logs" USING "btree" ("org_id");



CREATE INDEX "idx_calendar_integrations_user" ON "public"."ca_user_calendar_integrations" USING "btree" ("user_id");



CREATE INDEX "idx_cand_certs_cand" ON "public"."ca_candidate_certifications" USING "btree" ("candidate_id");



CREATE INDEX "idx_cand_certs_deleted" ON "public"."ca_candidate_certifications" USING "btree" ("deleted_at");



CREATE INDEX "idx_cand_certs_does_not_expire" ON "public"."ca_candidate_certifications" USING "btree" ("does_not_expire");



CREATE INDEX "idx_cand_certs_is_deleted" ON "public"."ca_candidate_certifications" USING "btree" ("is_deleted");



CREATE INDEX "idx_cand_certs_issuer" ON "public"."ca_candidate_certifications" USING "btree" ("issuer");



CREATE INDEX "idx_cand_certs_name" ON "public"."ca_candidate_certifications" USING "btree" ("certification_name");



CREATE INDEX "idx_cand_educations_cand" ON "public"."ca_candidate_educations" USING "btree" ("candidate_id");



CREATE INDEX "idx_cand_educations_cand_highest" ON "public"."ca_candidate_educations" USING "btree" ("candidate_id", "is_highest");



CREATE INDEX "idx_cand_educations_cand_sort" ON "public"."ca_candidate_educations" USING "btree" ("candidate_id", "sort_order");



CREATE INDEX "idx_cand_educations_deleted" ON "public"."ca_candidate_educations" USING "btree" ("deleted_at");



CREATE INDEX "idx_cand_educations_is_deleted" ON "public"."ca_candidate_educations" USING "btree" ("is_deleted");



CREATE INDEX "idx_cand_employments_cand" ON "public"."ca_candidate_employments" USING "btree" ("candidate_id");



CREATE INDEX "idx_cand_employments_cand_current" ON "public"."ca_candidate_employments" USING "btree" ("candidate_id", "is_current");



CREATE INDEX "idx_cand_employments_cand_sort" ON "public"."ca_candidate_employments" USING "btree" ("candidate_id", "sort_order");



CREATE INDEX "idx_cand_employments_company" ON "public"."ca_candidate_employments" USING "btree" ("company_name");



CREATE INDEX "idx_cand_employments_deleted" ON "public"."ca_candidate_employments" USING "btree" ("deleted_at");



CREATE INDEX "idx_cand_employments_is_deleted" ON "public"."ca_candidate_employments" USING "btree" ("is_deleted");



CREATE INDEX "idx_cand_projects_cand" ON "public"."ca_candidate_projects" USING "btree" ("candidate_id");



CREATE INDEX "idx_cand_projects_deleted" ON "public"."ca_candidate_projects" USING "btree" ("deleted_at");



CREATE INDEX "idx_cand_projects_is_deleted" ON "public"."ca_candidate_projects" USING "btree" ("is_deleted");



CREATE INDEX "idx_cand_projects_title" ON "public"."ca_candidate_projects" USING "btree" ("title");



CREATE INDEX "idx_cand_social_cand" ON "public"."ca_candidate_social_links" USING "btree" ("candidate_id");



CREATE INDEX "idx_cand_social_cand_type" ON "public"."ca_candidate_social_links" USING "btree" ("candidate_id", "link_type");



CREATE INDEX "idx_cand_social_deleted" ON "public"."ca_candidate_social_links" USING "btree" ("deleted_at");



CREATE INDEX "idx_cand_social_is_deleted" ON "public"."ca_candidate_social_links" USING "btree" ("is_deleted");



CREATE INDEX "idx_candidate_certifications_org_id" ON "public"."ca_candidate_certifications" USING "btree" ("org_id");



CREATE INDEX "idx_candidate_educations_org_id" ON "public"."ca_candidate_educations" USING "btree" ("org_id");



CREATE INDEX "idx_candidate_employments_org_id" ON "public"."ca_candidate_employments" USING "btree" ("org_id");



CREATE INDEX "idx_candidate_job_stages_candidate" ON "public"."ca_candidate_job_stages" USING "btree" ("candidate_id");



CREATE INDEX "idx_candidate_job_stages_job_posting" ON "public"."ca_candidate_job_stages" USING "btree" ("job_posting_id");



CREATE INDEX "idx_candidate_job_stages_org_id" ON "public"."ca_candidate_job_stages" USING "btree" ("org_id");



CREATE INDEX "idx_candidate_projects_org_id" ON "public"."ca_candidate_projects" USING "btree" ("org_id");



CREATE INDEX "idx_candidate_social_links_org_id" ON "public"."ca_candidate_social_links" USING "btree" ("org_id");



CREATE INDEX "idx_candidates_deleted_at" ON "public"."ca_candidates" USING "btree" ("deleted_at");



CREATE INDEX "idx_candidates_email_norm" ON "public"."ca_candidates" USING "btree" ("email_normalized");



CREATE INDEX "idx_candidates_email_trgm" ON "public"."ca_candidates" USING "gin" ("email_normalized" "public"."gin_trgm_ops");



CREATE INDEX "idx_candidates_is_deleted" ON "public"."ca_candidates" USING "btree" ("is_deleted");



CREATE INDEX "idx_candidates_location" ON "public"."ca_candidates" USING "btree" ("location");



CREATE INDEX "idx_candidates_name_trgm" ON "public"."ca_candidates" USING "gin" ("full_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_candidates_notice" ON "public"."ca_candidates" USING "btree" ("notice_period_days");



CREATE INDEX "idx_candidates_org_id" ON "public"."ca_candidates" USING "btree" ("org_id");



CREATE INDEX "idx_candidates_phone_norm" ON "public"."ca_candidates" USING "btree" ("phone_normalized");



CREATE INDEX "idx_candidates_phone_trgm" ON "public"."ca_candidates" USING "gin" ("phone_normalized" "public"."gin_trgm_ops");



CREATE INDEX "idx_candidates_relevant_exp" ON "public"."ca_candidates" USING "btree" ("relevant_exp_months");



CREATE INDEX "idx_candidates_status" ON "public"."ca_candidates" USING "btree" ("status");



CREATE INDEX "idx_candidates_status_exp" ON "public"."ca_candidates" USING "btree" ("status", "total_exp_months");



CREATE INDEX "idx_candidates_status_loc" ON "public"."ca_candidates" USING "btree" ("status", "location");



CREATE INDEX "idx_candidates_status_notice" ON "public"."ca_candidates" USING "btree" ("status", "notice_period_days");



CREATE INDEX "idx_candidates_summary_gin" ON "public"."ca_candidates" USING "gin" ("to_tsvector"('"english"'::"regconfig", "profile_summary"));



CREATE INDEX "idx_candidates_total_exp" ON "public"."ca_candidates" USING "btree" ("total_exp_months");



CREATE INDEX "idx_candidates_updated_at" ON "public"."ca_candidates" USING "btree" ("updated_at");



CREATE INDEX "idx_contacts_deleted_at" ON "public"."ca_contacts" USING "btree" ("deleted_at");



CREATE INDEX "idx_contacts_entity" ON "public"."ca_contacts" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_contacts_entity_type" ON "public"."ca_contacts" USING "btree" ("entity_type", "entity_id", "contact_type");



CREATE INDEX "idx_contacts_is_deleted" ON "public"."ca_contacts" USING "btree" ("is_deleted");



CREATE INDEX "idx_contacts_org_id" ON "public"."ca_contacts" USING "btree" ("org_id");



CREATE INDEX "idx_contacts_value_normalized" ON "public"."ca_contacts" USING "btree" ("contact_value_normalized");



CREATE INDEX "idx_documents_deleted_at" ON "public"."ca_documents" USING "btree" ("deleted_at");



CREATE INDEX "idx_documents_entity_id" ON "public"."ca_documents" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_documents_entity_type_doc" ON "public"."ca_documents" USING "btree" ("entity_type", "entity_id", "document_type");



CREATE INDEX "idx_documents_file_hash" ON "public"."ca_documents" USING "btree" ("file_hash");



CREATE INDEX "idx_documents_is_deleted" ON "public"."ca_documents" USING "btree" ("is_deleted");



CREATE INDEX "idx_documents_org_id" ON "public"."ca_documents" USING "btree" ("org_id");



CREATE INDEX "idx_documents_parse_status" ON "public"."ca_documents" USING "btree" ("parse_status");



CREATE INDEX "idx_documents_parsed_text_gin" ON "public"."ca_documents" USING "gin" ("to_tsvector"('"english"'::"regconfig", "parsed_text"));



CREATE INDEX "idx_documents_resume_hash" ON "public"."ca_documents" USING "btree" ("resume_hash");



CREATE INDEX "idx_dup_created_desc" ON "public"."ca_duplicate_matches" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_dup_incoming_cand" ON "public"."ca_duplicate_matches" USING "btree" ("incoming_candidate_id");



CREATE INDEX "idx_dup_match_level" ON "public"."ca_duplicate_matches" USING "btree" ("match_level");



CREATE INDEX "idx_dup_matched_cand" ON "public"."ca_duplicate_matches" USING "btree" ("matched_candidate_id");



CREATE INDEX "idx_dup_reviewed_by" ON "public"."ca_duplicate_matches" USING "btree" ("reviewed_by");



CREATE INDEX "idx_dup_signals_gin" ON "public"."ca_duplicate_matches" USING "gin" ("matching_signals");



CREATE INDEX "idx_dup_status" ON "public"."ca_duplicate_matches" USING "btree" ("status");



CREATE INDEX "idx_duplicate_matches_org_id" ON "public"."ca_duplicate_matches" USING "btree" ("org_id");



CREATE INDEX "idx_entity_tags_entity" ON "public"."ca_entity_tags" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_entity_tags_source" ON "public"."ca_entity_tags" USING "btree" ("source");



CREATE INDEX "idx_entity_tags_tag_id" ON "public"."ca_entity_tags" USING "btree" ("tag_id");



CREATE INDEX "idx_feedback_sub_interview" ON "public"."ca_feedback_submissions" USING "btree" ("interview_id");



CREATE INDEX "idx_feedback_sub_recommendation" ON "public"."ca_feedback_submissions" USING "btree" ("recommendation");



CREATE INDEX "idx_feedback_sub_submitted" ON "public"."ca_feedback_submissions" USING "btree" ("submitted_at");



CREATE UNIQUE INDEX "idx_feedback_sub_task_uq" ON "public"."ca_feedback_submissions" USING "btree" ("feedback_task_id");



CREATE INDEX "idx_feedback_sub_user" ON "public"."ca_feedback_submissions" USING "btree" ("interviewer_user_id");



CREATE INDEX "idx_feedback_submissions_org_id" ON "public"."ca_feedback_submissions" USING "btree" ("org_id");



CREATE INDEX "idx_feedback_task_due" ON "public"."ca_feedback_tasks" USING "btree" ("due_at");



CREATE UNIQUE INDEX "idx_feedback_task_interview_user_uq" ON "public"."ca_feedback_tasks" USING "btree" ("interview_id", "interviewer_user_id");



CREATE INDEX "idx_feedback_task_status" ON "public"."ca_feedback_tasks" USING "btree" ("status");



CREATE INDEX "idx_feedback_task_status_due" ON "public"."ca_feedback_tasks" USING "btree" ("status", "due_at");



CREATE INDEX "idx_feedback_task_user" ON "public"."ca_feedback_tasks" USING "btree" ("interviewer_user_id");



CREATE INDEX "idx_feedback_task_user_status" ON "public"."ca_feedback_tasks" USING "btree" ("interviewer_user_id", "status");



CREATE INDEX "idx_feedback_tasks_org_id" ON "public"."ca_feedback_tasks" USING "btree" ("org_id");



CREATE INDEX "idx_interview_assignments_org_id" ON "public"."ca_interview_assignments" USING "btree" ("org_id");



CREATE UNIQUE INDEX "idx_interview_provider_configs" ON "public"."ca_interview_provider_configurations" USING "btree" ("provider");



CREATE INDEX "idx_interview_provider_configurations_org_id" ON "public"."ca_interview_provider_configurations" USING "btree" ("org_id");



CREATE INDEX "idx_interviews_app" ON "public"."ca_interviews" USING "btree" ("application_id");



CREATE UNIQUE INDEX "idx_interviews_app_round_uq" ON "public"."ca_interviews" USING "btree" ("application_id", "round_no");



CREATE INDEX "idx_interviews_app_start" ON "public"."ca_interviews" USING "btree" ("application_id", "scheduled_start_utc");



CREATE INDEX "idx_interviews_app_status" ON "public"."ca_interviews" USING "btree" ("application_id", "status");



CREATE INDEX "idx_interviews_created_by" ON "public"."ca_interviews" USING "btree" ("created_by");



CREATE INDEX "idx_interviews_deleted_at" ON "public"."ca_interviews" USING "btree" ("deleted_at");



CREATE INDEX "idx_interviews_is_deleted" ON "public"."ca_interviews" USING "btree" ("is_deleted");



CREATE INDEX "idx_interviews_org_id" ON "public"."ca_interviews" USING "btree" ("org_id");



CREATE INDEX "idx_interviews_outlook_event" ON "public"."ca_interviews" USING "btree" ("outlook_event_id");



CREATE INDEX "idx_interviews_scheduled_start" ON "public"."ca_interviews" USING "btree" ("scheduled_start_utc");



CREATE INDEX "idx_interviews_status" ON "public"."ca_interviews" USING "btree" ("status");



CREATE INDEX "idx_jcm_candidate" ON "public"."ca_job_candidate_matches" USING "btree" ("candidate_id");



CREATE INDEX "idx_jcm_created_at" ON "public"."ca_job_candidate_matches" USING "btree" ("created_at");



CREATE INDEX "idx_jcm_deleted_at" ON "public"."ca_job_candidate_matches" USING "btree" ("deleted_at");



CREATE INDEX "idx_jcm_is_active" ON "public"."ca_job_candidate_matches" USING "btree" ("is_active");



CREATE INDEX "idx_jcm_job" ON "public"."ca_job_candidate_matches" USING "btree" ("job_id");



CREATE UNIQUE INDEX "idx_jcm_job_candidate_uq" ON "public"."ca_job_candidate_matches" USING "btree" ("job_id", "candidate_id");



CREATE INDEX "idx_jd_composite_req_status" ON "public"."ca_job_descriptions" USING "btree" ("requisition_id", "status");



CREATE INDEX "idx_jd_composite_status_type" ON "public"."ca_job_descriptions" USING "btree" ("status", "work_mode", "employment_type");



CREATE INDEX "idx_jd_deleted" ON "public"."ca_job_descriptions" USING "btree" ("deleted_at");



CREATE INDEX "idx_jd_emp_type" ON "public"."ca_job_descriptions" USING "btree" ("employment_type");



CREATE INDEX "idx_jd_is_deleted" ON "public"."ca_job_descriptions" USING "btree" ("is_deleted");



CREATE INDEX "idx_jd_loc" ON "public"."ca_job_descriptions" USING "btree" ("location");



CREATE INDEX "idx_jd_must_have_gin" ON "public"."ca_job_descriptions" USING "gin" ("to_tsvector"('"english"'::"regconfig", "must_have_text"));



CREATE INDEX "idx_jd_nice_have_gin" ON "public"."ca_job_descriptions" USING "gin" ("to_tsvector"('"english"'::"regconfig", "nice_to_have_text"));



CREATE INDEX "idx_jd_owner" ON "public"."ca_job_descriptions" USING "btree" ("owner_user_id");



CREATE INDEX "idx_jd_req_id" ON "public"."ca_job_descriptions" USING "btree" ("requisition_id");



CREATE INDEX "idx_jd_status" ON "public"."ca_job_descriptions" USING "btree" ("status");



CREATE INDEX "idx_jd_summary_gin" ON "public"."ca_job_descriptions" USING "gin" ("to_tsvector"('"english"'::"regconfig", "job_summary"));



CREATE INDEX "idx_jd_work_mode" ON "public"."ca_job_descriptions" USING "btree" ("work_mode");



CREATE INDEX "idx_job_candidate_matches_org_id" ON "public"."ca_job_candidate_matches" USING "btree" ("org_id");



CREATE INDEX "idx_job_descriptions_org_id" ON "public"."ca_job_descriptions" USING "btree" ("org_id");



CREATE INDEX "idx_job_postings_is_active" ON "public"."ca_job_postings" USING "btree" ("is_active");



CREATE INDEX "idx_job_postings_jd_id" ON "public"."ca_job_postings" USING "btree" ("jd_id");



CREATE INDEX "idx_job_postings_org_id" ON "public"."ca_job_postings" USING "btree" ("org_id");



CREATE UNIQUE INDEX "idx_job_req_code" ON "public"."ca_job_requisitions" USING "btree" ("code");



CREATE INDEX "idx_job_req_deleted" ON "public"."ca_job_requisitions" USING "btree" ("deleted_at");



CREATE INDEX "idx_job_req_dept" ON "public"."ca_job_requisitions" USING "btree" ("department");



CREATE INDEX "idx_job_req_dept_status" ON "public"."ca_job_requisitions" USING "btree" ("department", "status");



CREATE INDEX "idx_job_req_hm" ON "public"."ca_job_requisitions" USING "btree" ("hiring_manager_id");



CREATE INDEX "idx_job_req_is_deleted" ON "public"."ca_job_requisitions" USING "btree" ("is_deleted");



CREATE INDEX "idx_job_req_owner" ON "public"."ca_job_requisitions" USING "btree" ("owner_user_id");



CREATE INDEX "idx_job_req_priority" ON "public"."ca_job_requisitions" USING "btree" ("priority");



CREATE INDEX "idx_job_req_status" ON "public"."ca_job_requisitions" USING "btree" ("status");



CREATE INDEX "idx_job_req_status_priority" ON "public"."ca_job_requisitions" USING "btree" ("status", "priority");



CREATE INDEX "idx_job_requisitions_org_id" ON "public"."ca_job_requisitions" USING "btree" ("org_id");



CREATE INDEX "idx_modules_active" ON "public"."ca_modules" USING "btree" ("is_active");



CREATE UNIQUE INDEX "idx_modules_code" ON "public"."ca_modules" USING "btree" ("code");



CREATE INDEX "idx_modules_group" ON "public"."ca_modules" USING "btree" ("module_group");



CREATE UNIQUE INDEX "idx_modules_name" ON "public"."ca_modules" USING "btree" ("name");



CREATE INDEX "idx_notes_author" ON "public"."ca_notes" USING "btree" ("author_id");



CREATE INDEX "idx_notes_content_gin" ON "public"."ca_notes" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "idx_notes_deleted_at" ON "public"."ca_notes" USING "btree" ("deleted_at");



CREATE INDEX "idx_notes_entity" ON "public"."ca_notes" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_notes_is_deleted" ON "public"."ca_notes" USING "btree" ("is_deleted");



CREATE INDEX "idx_notes_org_id" ON "public"."ca_notes" USING "btree" ("org_id");



CREATE INDEX "idx_notifications_org_id" ON "public"."ca_notifications" USING "btree" ("org_id");



CREATE INDEX "idx_notifications_related_entity" ON "public"."ca_notifications" USING "btree" ("related_entity_type", "related_entity_id");



CREATE INDEX "idx_notifications_status_channel" ON "public"."ca_notifications" USING "btree" ("status", "channel");



CREATE INDEX "idx_notifications_user_id" ON "public"."ca_notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_read_time" ON "public"."ca_notifications" USING "btree" ("user_id", "is_read", "created_at" DESC);



CREATE UNIQUE INDEX "idx_offers_application_uq" ON "public"."ca_offers" USING "btree" ("application_id");



CREATE INDEX "idx_offers_created_at" ON "public"."ca_offers" USING "btree" ("created_at");



CREATE INDEX "idx_offers_created_by" ON "public"."ca_offers" USING "btree" ("created_by");



CREATE INDEX "idx_offers_deleted_at" ON "public"."ca_offers" USING "btree" ("deleted_at");



CREATE INDEX "idx_offers_is_deleted" ON "public"."ca_offers" USING "btree" ("is_deleted");



CREATE INDEX "idx_offers_joining" ON "public"."ca_offers" USING "btree" ("joining_date");



CREATE INDEX "idx_offers_org_id" ON "public"."ca_offers" USING "btree" ("org_id");



CREATE INDEX "idx_offers_status" ON "public"."ca_offers" USING "btree" ("status");



CREATE INDEX "idx_offers_valid_till" ON "public"."ca_offers" USING "btree" ("offer_valid_till");



CREATE INDEX "idx_organisations_deleted_at" ON "public"."ca_organisations" USING "btree" ("deleted_at");



CREATE INDEX "idx_organisations_name" ON "public"."ca_organisations" USING "btree" ("name");



CREATE INDEX "idx_organisations_status" ON "public"."ca_organisations" USING "btree" ("status") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_roles_code_org" ON "public"."ca_roles" USING "btree" ("org_id", "code") WHERE (("org_id" IS NOT NULL) AND ("deleted_at" IS NULL));



CREATE UNIQUE INDEX "idx_roles_code_platform" ON "public"."ca_roles" USING "btree" ("code") WHERE (("org_id" IS NULL) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_roles_is_active" ON "public"."ca_roles" USING "btree" ("is_active");



CREATE UNIQUE INDEX "idx_roles_name_org" ON "public"."ca_roles" USING "btree" ("org_id", "name") WHERE (("org_id" IS NOT NULL) AND ("deleted_at" IS NULL));



CREATE UNIQUE INDEX "idx_roles_name_platform" ON "public"."ca_roles" USING "btree" ("name") WHERE (("org_id" IS NULL) AND ("deleted_at" IS NULL));



CREATE UNIQUE INDEX "idx_rp_role_module" ON "public"."ca_role_permissions" USING "btree" ("role_id", "module_id");



CREATE INDEX "idx_status_history_changed_by" ON "public"."ca_status_history" USING "btree" ("changed_by");



CREATE INDEX "idx_status_history_entity_time" ON "public"."ca_status_history" USING "btree" ("entity_type", "entity_id", "changed_at" DESC);



CREATE INDEX "idx_status_history_org_id" ON "public"."ca_status_history" USING "btree" ("org_id");



CREATE INDEX "idx_status_history_to_status" ON "public"."ca_status_history" USING "btree" ("to_status");



CREATE INDEX "idx_tags_active" ON "public"."ca_tags" USING "btree" ("active");



CREATE INDEX "idx_tags_deleted_at" ON "public"."ca_tags" USING "btree" ("deleted_at");



CREATE INDEX "idx_tags_is_deleted" ON "public"."ca_tags" USING "btree" ("is_deleted");



CREATE UNIQUE INDEX "idx_tags_normalized_type" ON "public"."ca_tags" USING "btree" ("normalized_name", "type");



CREATE INDEX "idx_tags_org_id" ON "public"."ca_tags" USING "btree" ("org_id");



CREATE INDEX "idx_tags_type" ON "public"."ca_tags" USING "btree" ("type");



CREATE INDEX "idx_tasks_application_id" ON "public"."ca_tasks" USING "btree" ("application_id");



CREATE INDEX "idx_tasks_candidate_id" ON "public"."ca_tasks" USING "btree" ("candidate_id");



CREATE INDEX "idx_tasks_is_active" ON "public"."ca_tasks" USING "btree" ("is_active");



CREATE INDEX "idx_tasks_jd_id" ON "public"."ca_tasks" USING "btree" ("jd_id");



CREATE INDEX "idx_tasks_jobposting_id" ON "public"."ca_tasks" USING "btree" ("jobposting_id");



CREATE INDEX "idx_tasks_org_id" ON "public"."ca_tasks" USING "btree" ("org_id");



CREATE INDEX "idx_tasks_status" ON "public"."ca_tasks" USING "btree" ("status");



CREATE INDEX "idx_user_calendar_integrations_org_id" ON "public"."ca_user_calendar_integrations" USING "btree" ("org_id");



CREATE INDEX "idx_user_meeting_integrations_org_id" ON "public"."ca_user_meeting_integrations" USING "btree" ("org_id");



CREATE UNIQUE INDEX "idx_user_meeting_provider" ON "public"."ca_user_meeting_integrations" USING "btree" ("user_id", "provider");



CREATE UNIQUE INDEX "idx_user_roles_primary" ON "public"."ca_user_roles" USING "btree" ("user_id") WHERE ("is_primary" = true);



CREATE INDEX "idx_user_roles_role_id" ON "public"."ca_user_roles" USING "btree" ("role_id");



CREATE UNIQUE INDEX "idx_user_roles_user_role_composite" ON "public"."ca_user_roles" USING "btree" ("user_id", "role_id");



CREATE INDEX "idx_users_deleted_at" ON "public"."ca_users" USING "btree" ("deleted_at");



CREATE INDEX "idx_users_department" ON "public"."ca_users" USING "btree" ("department");



CREATE UNIQUE INDEX "idx_users_email_normalized" ON "public"."ca_users" USING "btree" ("email_normalized");



CREATE UNIQUE INDEX "idx_users_employee_code" ON "public"."ca_users" USING "btree" ("employee_code") WHERE ("employee_code" IS NOT NULL);



CREATE INDEX "idx_users_full_name" ON "public"."ca_users" USING "btree" ("full_name");



CREATE INDEX "idx_users_is_deleted" ON "public"."ca_users" USING "btree" ("is_deleted");



CREATE INDEX "idx_users_org_id" ON "public"."ca_users" USING "btree" ("org_id");



CREATE INDEX "idx_users_status" ON "public"."ca_users" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_users_supabase_auth_user_id" ON "public"."ca_users" USING "btree" ("supabase_auth_user_id") WHERE ("supabase_auth_user_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_cand_educations_highest" ON "public"."ca_candidate_educations" USING "btree" ("candidate_id") WHERE ("is_highest" = true);



CREATE UNIQUE INDEX "uq_cand_employments_current" ON "public"."ca_candidate_employments" USING "btree" ("candidate_id") WHERE ("is_current" = true);



CREATE UNIQUE INDEX "uq_cand_social_primary_type" ON "public"."ca_candidate_social_links" USING "btree" ("candidate_id", "link_type") WHERE ("is_primary" = true);



CREATE UNIQUE INDEX "uq_documents_storage" ON "public"."ca_documents" USING "btree" ("storage_bucket", "storage_key");



CREATE OR REPLACE TRIGGER "trig_addresses_updated_at" BEFORE UPDATE ON "public"."ca_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_admin_settings_updated_at" BEFORE UPDATE ON "public"."ca_admin_settings" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_assignments_updated_at" BEFORE UPDATE ON "public"."ca_interview_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_cand_certs_updated_at" BEFORE UPDATE ON "public"."ca_candidate_certifications" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_cand_educations_updated_at" BEFORE UPDATE ON "public"."ca_candidate_educations" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_cand_employments_updated_at" BEFORE UPDATE ON "public"."ca_candidate_employments" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_cand_projects_updated_at" BEFORE UPDATE ON "public"."ca_candidate_projects" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_cand_social_updated_at" BEFORE UPDATE ON "public"."ca_candidate_social_links" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_candidate_job_stages_updated_at" BEFORE UPDATE ON "public"."ca_candidate_job_stages" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_candidates_updated_at" BEFORE UPDATE ON "public"."ca_candidates" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_contacts_updated_at" BEFORE UPDATE ON "public"."ca_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_documents_updated_at" BEFORE UPDATE ON "public"."ca_documents" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_dup_matches_updated_at" BEFORE UPDATE ON "public"."ca_duplicate_matches" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_feedback_subs_updated_at" BEFORE UPDATE ON "public"."ca_feedback_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_feedback_tasks_updated_at" BEFORE UPDATE ON "public"."ca_feedback_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_interview_provider_configs_updated_at" BEFORE UPDATE ON "public"."ca_interview_provider_configurations" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_interviews_updated_at" BEFORE UPDATE ON "public"."ca_interviews" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_jd_updated_at" BEFORE UPDATE ON "public"."ca_job_descriptions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_job_candidate_matches_updated_at" BEFORE UPDATE ON "public"."ca_job_candidate_matches" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_job_postings_updated_at" BEFORE UPDATE ON "public"."ca_job_postings" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_job_req_updated_at" BEFORE UPDATE ON "public"."ca_job_requisitions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_modules_updated_at" BEFORE UPDATE ON "public"."ca_modules" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_notes_updated_at" BEFORE UPDATE ON "public"."ca_notes" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_notifications_updated_at" BEFORE UPDATE ON "public"."ca_notifications" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_offers_updated_at" BEFORE UPDATE ON "public"."ca_offers" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_protect_job_descriptions_code" BEFORE UPDATE ON "public"."ca_job_descriptions" FOR EACH ROW EXECUTE FUNCTION "public"."protect_code_column"();



CREATE OR REPLACE TRIGGER "trig_protect_job_postings_code" BEFORE UPDATE ON "public"."ca_job_postings" FOR EACH ROW EXECUTE FUNCTION "public"."protect_code_column"();



CREATE OR REPLACE TRIGGER "trig_protect_job_requisitions_code" BEFORE UPDATE ON "public"."ca_job_requisitions" FOR EACH ROW EXECUTE FUNCTION "public"."protect_code_column"();



CREATE OR REPLACE TRIGGER "trig_role_permissions_updated_at" BEFORE UPDATE ON "public"."ca_role_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_roles_updated_at" BEFORE UPDATE ON "public"."ca_roles" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_tags_updated_at" BEFORE UPDATE ON "public"."ca_tags" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_tasks_updated_at" BEFORE UPDATE ON "public"."ca_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_user_meeting_integrations_updated_at" BEFORE UPDATE ON "public"."ca_user_meeting_integrations" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_users_updated_at" BEFORE UPDATE ON "public"."ca_users" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



ALTER TABLE ONLY "public"."ca_candidate_job_stages"
    ADD CONSTRAINT "candidate_job_stages_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_candidate_job_stages"
    ADD CONSTRAINT "candidate_job_stages_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "public"."ca_job_postings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_addresses"
    ADD CONSTRAINT "fk_addresses_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_addresses"
    ADD CONSTRAINT "fk_addresses_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_addresses"
    ADD CONSTRAINT "fk_addresses_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_admin_settings"
    ADD CONSTRAINT "fk_admin_settings_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_admin_settings"
    ADD CONSTRAINT "fk_admin_settings_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_interview_assignments"
    ADD CONSTRAINT "fk_assignment_interview" FOREIGN KEY ("interview_id") REFERENCES "public"."ca_interviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_interview_assignments"
    ADD CONSTRAINT "fk_assignment_interviewer" FOREIGN KEY ("interviewer_user_id") REFERENCES "public"."ca_users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ca_audit_logs"
    ADD CONSTRAINT "fk_audit_logs_changed_by" FOREIGN KEY ("changed_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_audit_logs"
    ADD CONSTRAINT "fk_audit_logs_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_user_calendar_integrations"
    ADD CONSTRAINT "fk_calendar_integrations_user" FOREIGN KEY ("user_id") REFERENCES "public"."ca_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_candidate_certifications"
    ADD CONSTRAINT "fk_cand_certs_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_candidate_certifications"
    ADD CONSTRAINT "fk_cand_certs_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_candidate_certifications"
    ADD CONSTRAINT "fk_cand_certs_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_candidate_educations"
    ADD CONSTRAINT "fk_cand_educations_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_candidate_educations"
    ADD CONSTRAINT "fk_cand_educations_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_candidate_educations"
    ADD CONSTRAINT "fk_cand_educations_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_candidate_employments"
    ADD CONSTRAINT "fk_cand_employments_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_candidate_employments"
    ADD CONSTRAINT "fk_cand_employments_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_candidate_employments"
    ADD CONSTRAINT "fk_cand_employments_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_candidate_projects"
    ADD CONSTRAINT "fk_cand_projects_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_candidate_projects"
    ADD CONSTRAINT "fk_cand_projects_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_candidate_projects"
    ADD CONSTRAINT "fk_cand_projects_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_candidate_social_links"
    ADD CONSTRAINT "fk_cand_social_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_candidate_social_links"
    ADD CONSTRAINT "fk_cand_social_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_candidate_social_links"
    ADD CONSTRAINT "fk_cand_social_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_candidate_certifications"
    ADD CONSTRAINT "fk_candidate_certifications_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_candidate_educations"
    ADD CONSTRAINT "fk_candidate_educations_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_candidate_employments"
    ADD CONSTRAINT "fk_candidate_employments_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_candidate_projects"
    ADD CONSTRAINT "fk_candidate_projects_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_candidate_social_links"
    ADD CONSTRAINT "fk_candidate_social_links_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_candidates"
    ADD CONSTRAINT "fk_candidates_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_candidates"
    ADD CONSTRAINT "fk_candidates_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_candidates"
    ADD CONSTRAINT "fk_candidates_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_contacts"
    ADD CONSTRAINT "fk_contacts_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_contacts"
    ADD CONSTRAINT "fk_contacts_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_contacts"
    ADD CONSTRAINT "fk_contacts_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_documents"
    ADD CONSTRAINT "fk_documents_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_documents"
    ADD CONSTRAINT "fk_documents_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_duplicate_matches"
    ADD CONSTRAINT "fk_dup_incoming_cand" FOREIGN KEY ("incoming_candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_duplicate_matches"
    ADD CONSTRAINT "fk_dup_matched_cand" FOREIGN KEY ("matched_candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ca_duplicate_matches"
    ADD CONSTRAINT "fk_dup_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_duplicate_matches"
    ADD CONSTRAINT "fk_duplicate_matches_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_entity_tags"
    ADD CONSTRAINT "fk_entity_tags_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_entity_tags"
    ADD CONSTRAINT "fk_entity_tags_tag" FOREIGN KEY ("tag_id") REFERENCES "public"."ca_tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_feedback_submissions"
    ADD CONSTRAINT "fk_feedback_sub_interview" FOREIGN KEY ("interview_id") REFERENCES "public"."ca_interviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_feedback_submissions"
    ADD CONSTRAINT "fk_feedback_sub_interviewer" FOREIGN KEY ("interviewer_user_id") REFERENCES "public"."ca_users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ca_feedback_submissions"
    ADD CONSTRAINT "fk_feedback_sub_task" FOREIGN KEY ("feedback_task_id") REFERENCES "public"."ca_feedback_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_feedback_submissions"
    ADD CONSTRAINT "fk_feedback_submissions_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_feedback_tasks"
    ADD CONSTRAINT "fk_feedback_task_interview" FOREIGN KEY ("interview_id") REFERENCES "public"."ca_interviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_feedback_tasks"
    ADD CONSTRAINT "fk_feedback_task_interviewer" FOREIGN KEY ("interviewer_user_id") REFERENCES "public"."ca_users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ca_feedback_tasks"
    ADD CONSTRAINT "fk_feedback_tasks_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_interview_assignments"
    ADD CONSTRAINT "fk_interview_assignments_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_interview_provider_configurations"
    ADD CONSTRAINT "fk_interview_provider_configurations_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_interviews"
    ADD CONSTRAINT "fk_interviews_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_interviews"
    ADD CONSTRAINT "fk_interviews_meeting_created_by" FOREIGN KEY ("meeting_created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_interviews"
    ADD CONSTRAINT "fk_interviews_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_job_candidate_matches"
    ADD CONSTRAINT "fk_jcm_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_job_candidate_matches"
    ADD CONSTRAINT "fk_jcm_jd" FOREIGN KEY ("job_id") REFERENCES "public"."ca_job_descriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_job_descriptions"
    ADD CONSTRAINT "fk_jd_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_job_descriptions"
    ADD CONSTRAINT "fk_jd_owner" FOREIGN KEY ("owner_user_id") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_job_descriptions"
    ADD CONSTRAINT "fk_jd_requisition" FOREIGN KEY ("requisition_id") REFERENCES "public"."ca_job_requisitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_job_descriptions"
    ADD CONSTRAINT "fk_jd_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_job_candidate_matches"
    ADD CONSTRAINT "fk_job_candidate_matches_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_job_descriptions"
    ADD CONSTRAINT "fk_job_descriptions_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_job_postings"
    ADD CONSTRAINT "fk_job_postings_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_job_postings"
    ADD CONSTRAINT "fk_job_postings_jd" FOREIGN KEY ("jd_id") REFERENCES "public"."ca_job_descriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_job_postings"
    ADD CONSTRAINT "fk_job_postings_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_job_postings"
    ADD CONSTRAINT "fk_job_postings_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_job_requisitions"
    ADD CONSTRAINT "fk_job_req_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_job_requisitions"
    ADD CONSTRAINT "fk_job_req_hm" FOREIGN KEY ("hiring_manager_id") REFERENCES "public"."ca_users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ca_job_requisitions"
    ADD CONSTRAINT "fk_job_req_owner" FOREIGN KEY ("owner_user_id") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_job_requisitions"
    ADD CONSTRAINT "fk_job_req_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_job_requisitions"
    ADD CONSTRAINT "fk_job_requisitions_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_notes"
    ADD CONSTRAINT "fk_notes_author" FOREIGN KEY ("author_id") REFERENCES "public"."ca_users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ca_notes"
    ADD CONSTRAINT "fk_notes_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_notifications"
    ADD CONSTRAINT "fk_notifications_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_notifications"
    ADD CONSTRAINT "fk_notifications_user" FOREIGN KEY ("user_id") REFERENCES "public"."ca_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_offers"
    ADD CONSTRAINT "fk_offers_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_offers"
    ADD CONSTRAINT "fk_offers_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_roles"
    ADD CONSTRAINT "fk_roles_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_status_history"
    ADD CONSTRAINT "fk_status_history_changed_by" FOREIGN KEY ("changed_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_status_history"
    ADD CONSTRAINT "fk_status_history_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_tags"
    ADD CONSTRAINT "fk_tags_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_tags"
    ADD CONSTRAINT "fk_tags_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_tags"
    ADD CONSTRAINT "fk_tags_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_tasks"
    ADD CONSTRAINT "fk_tasks_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_tasks"
    ADD CONSTRAINT "fk_tasks_jd" FOREIGN KEY ("jd_id") REFERENCES "public"."ca_job_descriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_tasks"
    ADD CONSTRAINT "fk_tasks_jobposting" FOREIGN KEY ("jobposting_id") REFERENCES "public"."ca_job_postings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_tasks"
    ADD CONSTRAINT "fk_tasks_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_tasks"
    ADD CONSTRAINT "fk_tasks_submitted_by" FOREIGN KEY ("submitted_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_user_calendar_integrations"
    ADD CONSTRAINT "fk_user_calendar_integrations_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_user_meeting_integrations"
    ADD CONSTRAINT "fk_user_meeting_integrations_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_user_roles"
    ADD CONSTRAINT "fk_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "public"."ca_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_user_roles"
    ADD CONSTRAINT "fk_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "public"."ca_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_users"
    ADD CONSTRAINT "fk_users_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_users"
    ADD CONSTRAINT "fk_users_org_id" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."ca_users"
    ADD CONSTRAINT "fk_users_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_interview_provider_configurations"
    ADD CONSTRAINT "interview_provider_configurations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_interview_provider_configurations"
    ADD CONSTRAINT "interview_provider_configurations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_interviews"
    ADD CONSTRAINT "interviews_meeting_created_by_fkey" FOREIGN KEY ("meeting_created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_organisations"
    ADD CONSTRAINT "organisations_primary_address_id_fkey" FOREIGN KEY ("primary_address_id") REFERENCES "public"."ca_addresses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_organisations"
    ADD CONSTRAINT "organisations_primary_email_contact_id_fkey" FOREIGN KEY ("primary_email_contact_id") REFERENCES "public"."ca_contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_organisations"
    ADD CONSTRAINT "organisations_primary_phone_contact_id_fkey" FOREIGN KEY ("primary_phone_contact_id") REFERENCES "public"."ca_contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_role_permissions"
    ADD CONSTRAINT "role_permissions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."ca_modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."ca_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_tasks"
    ADD CONSTRAINT "tasks_feedback_submission_id_fkey" FOREIGN KEY ("feedback_submission_id") REFERENCES "public"."ca_feedback_submissions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_user_meeting_integrations"
    ADD CONSTRAINT "user_meeting_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."ca_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_users"
    ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."ca_roles"("id") ON DELETE SET NULL;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_code_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_code_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_code_column"() TO "service_role";



GRANT ALL ON PROCEDURE "public"."seed_role_permissions"(IN "p_role_id" "uuid", IN "p_role_code" character varying) TO "anon";
GRANT ALL ON PROCEDURE "public"."seed_role_permissions"(IN "p_role_id" "uuid", IN "p_role_code" character varying) TO "authenticated";
GRANT ALL ON PROCEDURE "public"."seed_role_permissions"(IN "p_role_id" "uuid", IN "p_role_code" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";


















GRANT ALL ON TABLE "public"."_migrations" TO "anon";
GRANT ALL ON TABLE "public"."_migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."_migrations" TO "service_role";



GRANT ALL ON TABLE "public"."ca_addresses" TO "anon";
GRANT ALL ON TABLE "public"."ca_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."ca_admin_settings" TO "anon";
GRANT ALL ON TABLE "public"."ca_admin_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_admin_settings" TO "service_role";



GRANT ALL ON TABLE "public"."ca_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."ca_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."ca_candidate_certifications" TO "anon";
GRANT ALL ON TABLE "public"."ca_candidate_certifications" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_candidate_certifications" TO "service_role";



GRANT ALL ON TABLE "public"."ca_candidate_educations" TO "anon";
GRANT ALL ON TABLE "public"."ca_candidate_educations" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_candidate_educations" TO "service_role";



GRANT ALL ON TABLE "public"."ca_candidate_employments" TO "anon";
GRANT ALL ON TABLE "public"."ca_candidate_employments" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_candidate_employments" TO "service_role";



GRANT ALL ON TABLE "public"."ca_candidate_job_stages" TO "anon";
GRANT ALL ON TABLE "public"."ca_candidate_job_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_candidate_job_stages" TO "service_role";



GRANT ALL ON TABLE "public"."ca_candidate_projects" TO "anon";
GRANT ALL ON TABLE "public"."ca_candidate_projects" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_candidate_projects" TO "service_role";



GRANT ALL ON TABLE "public"."ca_candidate_social_links" TO "anon";
GRANT ALL ON TABLE "public"."ca_candidate_social_links" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_candidate_social_links" TO "service_role";



GRANT ALL ON TABLE "public"."ca_candidates" TO "anon";
GRANT ALL ON TABLE "public"."ca_candidates" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_candidates" TO "service_role";



GRANT ALL ON TABLE "public"."ca_contacts" TO "anon";
GRANT ALL ON TABLE "public"."ca_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."ca_documents" TO "anon";
GRANT ALL ON TABLE "public"."ca_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_documents" TO "service_role";



GRANT ALL ON TABLE "public"."ca_duplicate_matches" TO "anon";
GRANT ALL ON TABLE "public"."ca_duplicate_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_duplicate_matches" TO "service_role";



GRANT ALL ON TABLE "public"."ca_entity_tags" TO "anon";
GRANT ALL ON TABLE "public"."ca_entity_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_entity_tags" TO "service_role";



GRANT ALL ON TABLE "public"."ca_feedback_submissions" TO "anon";
GRANT ALL ON TABLE "public"."ca_feedback_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_feedback_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."ca_feedback_tasks" TO "anon";
GRANT ALL ON TABLE "public"."ca_feedback_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_feedback_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."ca_interview_assignments" TO "anon";
GRANT ALL ON TABLE "public"."ca_interview_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_interview_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."ca_interview_provider_configurations" TO "anon";
GRANT ALL ON TABLE "public"."ca_interview_provider_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_interview_provider_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."ca_interviews" TO "anon";
GRANT ALL ON TABLE "public"."ca_interviews" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_interviews" TO "service_role";



GRANT ALL ON TABLE "public"."ca_job_candidate_matches" TO "anon";
GRANT ALL ON TABLE "public"."ca_job_candidate_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_job_candidate_matches" TO "service_role";



GRANT ALL ON SEQUENCE "public"."job_description_code_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."job_description_code_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."job_description_code_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ca_job_descriptions" TO "anon";
GRANT ALL ON TABLE "public"."ca_job_descriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_job_descriptions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."job_posting_code_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."job_posting_code_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."job_posting_code_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ca_job_postings" TO "anon";
GRANT ALL ON TABLE "public"."ca_job_postings" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_job_postings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."job_requisition_code_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."job_requisition_code_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."job_requisition_code_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ca_job_requisitions" TO "anon";
GRANT ALL ON TABLE "public"."ca_job_requisitions" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_job_requisitions" TO "service_role";



GRANT ALL ON TABLE "public"."ca_modules" TO "anon";
GRANT ALL ON TABLE "public"."ca_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_modules" TO "service_role";



GRANT ALL ON TABLE "public"."ca_notes" TO "anon";
GRANT ALL ON TABLE "public"."ca_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_notes" TO "service_role";



GRANT ALL ON TABLE "public"."ca_notifications" TO "anon";
GRANT ALL ON TABLE "public"."ca_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."ca_offers" TO "anon";
GRANT ALL ON TABLE "public"."ca_offers" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_offers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."org_code_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."org_code_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."org_code_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ca_organisations" TO "anon";
GRANT ALL ON TABLE "public"."ca_organisations" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_organisations" TO "service_role";



GRANT ALL ON TABLE "public"."ca_role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."ca_role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."ca_roles" TO "anon";
GRANT ALL ON TABLE "public"."ca_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_roles" TO "service_role";



GRANT ALL ON TABLE "public"."ca_status_history" TO "anon";
GRANT ALL ON TABLE "public"."ca_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."ca_tags" TO "anon";
GRANT ALL ON TABLE "public"."ca_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_tags" TO "service_role";



GRANT ALL ON TABLE "public"."ca_tasks" TO "anon";
GRANT ALL ON TABLE "public"."ca_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."ca_user_calendar_integrations" TO "anon";
GRANT ALL ON TABLE "public"."ca_user_calendar_integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_user_calendar_integrations" TO "service_role";



GRANT ALL ON TABLE "public"."ca_user_meeting_integrations" TO "anon";
GRANT ALL ON TABLE "public"."ca_user_meeting_integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_user_meeting_integrations" TO "service_role";



GRANT ALL ON TABLE "public"."ca_user_roles" TO "anon";
GRANT ALL ON TABLE "public"."ca_user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."ca_users" TO "anon";
GRANT ALL ON TABLE "public"."ca_users" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_users" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tasks_task_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tasks_task_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tasks_task_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































