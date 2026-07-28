-- 28072026_00038_add_deferred_constraints_and_triggers.sql
-- This script applies all remaining foreign keys and triggers now that every table is guaranteed to exist.

ALTER TABLE ONLY "public"."ca_addresses" ADD CONSTRAINT "fk_addresses_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_addresses" ADD CONSTRAINT "fk_addresses_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY "public"."ca_addresses" ADD CONSTRAINT "fk_addresses_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
CREATE OR REPLACE TRIGGER "trig_addresses_updated_at" BEFORE UPDATE ON "public"."ca_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_admin_settings" ADD CONSTRAINT "fk_admin_settings_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY "public"."ca_admin_settings" ADD CONSTRAINT "fk_admin_settings_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
CREATE OR REPLACE TRIGGER "trig_admin_settings_updated_at" BEFORE UPDATE ON "public"."ca_admin_settings" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_audit_logs" ADD CONSTRAINT "fk_audit_logs_changed_by" FOREIGN KEY ("changed_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_audit_logs" ADD CONSTRAINT "fk_audit_logs_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;

ALTER TABLE ONLY "public"."ca_candidate_certifications" ADD CONSTRAINT "fk_cand_certs_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ca_candidate_certifications" ADD CONSTRAINT "fk_cand_certs_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_candidate_certifications" ADD CONSTRAINT "fk_cand_certs_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_candidate_certifications" ADD CONSTRAINT "fk_candidate_certifications_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
CREATE OR REPLACE TRIGGER "trig_cand_certs_updated_at" BEFORE UPDATE ON "public"."ca_candidate_certifications" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_candidate_educations" ADD CONSTRAINT "fk_cand_educations_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ca_candidate_educations" ADD CONSTRAINT "fk_cand_educations_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_candidate_educations" ADD CONSTRAINT "fk_cand_educations_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_candidate_educations" ADD CONSTRAINT "fk_candidate_educations_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
CREATE OR REPLACE TRIGGER "trig_cand_educations_updated_at" BEFORE UPDATE ON "public"."ca_candidate_educations" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_candidate_employments" ADD CONSTRAINT "fk_cand_employments_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ca_candidate_employments" ADD CONSTRAINT "fk_cand_employments_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_candidate_employments" ADD CONSTRAINT "fk_cand_employments_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_candidate_employments" ADD CONSTRAINT "fk_candidate_employments_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
CREATE OR REPLACE TRIGGER "trig_cand_employments_updated_at" BEFORE UPDATE ON "public"."ca_candidate_employments" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_candidate_job_stages" ADD CONSTRAINT "candidate_job_stages_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ca_candidate_job_stages" ADD CONSTRAINT "candidate_job_stages_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "public"."ca_job_postings"("id") ON DELETE CASCADE;
CREATE OR REPLACE TRIGGER "trig_candidate_job_stages_updated_at" BEFORE UPDATE ON "public"."ca_candidate_job_stages" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_candidate_projects" ADD CONSTRAINT "fk_cand_projects_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ca_candidate_projects" ADD CONSTRAINT "fk_cand_projects_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_candidate_projects" ADD CONSTRAINT "fk_cand_projects_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_candidate_projects" ADD CONSTRAINT "fk_candidate_projects_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
CREATE OR REPLACE TRIGGER "trig_cand_projects_updated_at" BEFORE UPDATE ON "public"."ca_candidate_projects" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_candidate_social_links" ADD CONSTRAINT "fk_cand_social_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."ca_candidates"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ca_candidate_social_links" ADD CONSTRAINT "fk_cand_social_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_candidate_social_links" ADD CONSTRAINT "fk_cand_social_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_candidate_social_links" ADD CONSTRAINT "fk_candidate_social_links_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
CREATE OR REPLACE TRIGGER "trig_cand_social_updated_at" BEFORE UPDATE ON "public"."ca_candidate_social_links" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_candidates" ADD CONSTRAINT "fk_candidates_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_candidates" ADD CONSTRAINT "fk_candidates_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY "public"."ca_candidates" ADD CONSTRAINT "fk_candidates_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
CREATE OR REPLACE TRIGGER "trig_candidates_updated_at" BEFORE UPDATE ON "public"."ca_candidates" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_contacts" ADD CONSTRAINT "fk_contacts_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_contacts" ADD CONSTRAINT "fk_contacts_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY "public"."ca_contacts" ADD CONSTRAINT "fk_contacts_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
CREATE OR REPLACE TRIGGER "trig_contacts_updated_at" BEFORE UPDATE ON "public"."ca_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_documents" ADD CONSTRAINT "fk_documents_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY "public"."ca_documents" ADD CONSTRAINT "fk_documents_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
CREATE OR REPLACE TRIGGER "trig_documents_updated_at" BEFORE UPDATE ON "public"."ca_documents" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_duplicate_matches" ADD CONSTRAINT "fk_dup_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_duplicate_matches" ADD CONSTRAINT "fk_duplicate_matches_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
CREATE OR REPLACE TRIGGER "trig_dup_matches_updated_at" BEFORE UPDATE ON "public"."ca_duplicate_matches" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_entity_tags" ADD CONSTRAINT "fk_entity_tags_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_entity_tags" ADD CONSTRAINT "fk_entity_tags_tag" FOREIGN KEY ("tag_id") REFERENCES "public"."ca_tags"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."ca_feedback_submissions" ADD CONSTRAINT "fk_feedback_sub_interview" FOREIGN KEY ("interview_id") REFERENCES "public"."ca_interviews"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ca_feedback_submissions" ADD CONSTRAINT "fk_feedback_sub_interviewer" FOREIGN KEY ("interviewer_user_id") REFERENCES "public"."ca_users"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."ca_feedback_submissions" ADD CONSTRAINT "fk_feedback_sub_task" FOREIGN KEY ("feedback_task_id") REFERENCES "public"."ca_feedback_tasks"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ca_feedback_submissions" ADD CONSTRAINT "fk_feedback_submissions_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
CREATE OR REPLACE TRIGGER "trig_feedback_subs_updated_at" BEFORE UPDATE ON "public"."ca_feedback_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_feedback_tasks" ADD CONSTRAINT "fk_feedback_task_interview" FOREIGN KEY ("interview_id") REFERENCES "public"."ca_interviews"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ca_feedback_tasks" ADD CONSTRAINT "fk_feedback_task_interviewer" FOREIGN KEY ("interviewer_user_id") REFERENCES "public"."ca_users"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."ca_feedback_tasks" ADD CONSTRAINT "fk_feedback_tasks_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
CREATE OR REPLACE TRIGGER "trig_feedback_tasks_updated_at" BEFORE UPDATE ON "public"."ca_feedback_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_interview_assignments" ADD CONSTRAINT "fk_assignment_interview" FOREIGN KEY ("interview_id") REFERENCES "public"."ca_interviews"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ca_interview_assignments" ADD CONSTRAINT "fk_assignment_interviewer" FOREIGN KEY ("interviewer_user_id") REFERENCES "public"."ca_users"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."ca_interview_assignments" ADD CONSTRAINT "fk_interview_assignments_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
CREATE OR REPLACE TRIGGER "trig_assignments_updated_at" BEFORE UPDATE ON "public"."ca_interview_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_interview_provider_configurations" ADD CONSTRAINT "fk_interview_provider_configurations_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
CREATE OR REPLACE TRIGGER "trig_interview_provider_configs_updated_at" BEFORE UPDATE ON "public"."ca_interview_provider_configurations" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_interviews" ADD CONSTRAINT "fk_interviews_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_interviews" ADD CONSTRAINT "fk_interviews_meeting_created_by" FOREIGN KEY ("meeting_created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_interviews" ADD CONSTRAINT "fk_interviews_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
CREATE OR REPLACE TRIGGER "trig_interviews_updated_at" BEFORE UPDATE ON "public"."ca_interviews" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_job_candidate_matches" ADD CONSTRAINT "fk_jcm_jd" FOREIGN KEY ("job_id") REFERENCES "public"."ca_job_descriptions"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ca_job_candidate_matches" ADD CONSTRAINT "fk_job_candidate_matches_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
CREATE OR REPLACE TRIGGER "trig_job_candidate_matches_updated_at" BEFORE UPDATE ON "public"."ca_job_candidate_matches" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_job_descriptions" ADD CONSTRAINT "fk_jd_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_job_descriptions" ADD CONSTRAINT "fk_jd_owner" FOREIGN KEY ("owner_user_id") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_job_descriptions" ADD CONSTRAINT "fk_jd_requisition" FOREIGN KEY ("requisition_id") REFERENCES "public"."ca_job_requisitions"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ca_job_descriptions" ADD CONSTRAINT "fk_jd_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_job_descriptions" ADD CONSTRAINT "fk_job_descriptions_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
CREATE OR REPLACE TRIGGER "trig_jd_updated_at" BEFORE UPDATE ON "public"."ca_job_descriptions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
CREATE OR REPLACE TRIGGER "trig_protect_job_descriptions_code" BEFORE UPDATE ON "public"."ca_job_descriptions" FOR EACH ROW EXECUTE FUNCTION "public"."protect_code_column"();

ALTER TABLE ONLY "public"."ca_job_postings" ADD CONSTRAINT "fk_job_postings_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_job_postings" ADD CONSTRAINT "fk_job_postings_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY "public"."ca_job_postings" ADD CONSTRAINT "fk_job_postings_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
CREATE OR REPLACE TRIGGER "trig_job_postings_updated_at" BEFORE UPDATE ON "public"."ca_job_postings" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
CREATE OR REPLACE TRIGGER "trig_protect_job_postings_code" BEFORE UPDATE ON "public"."ca_job_postings" FOR EACH ROW EXECUTE FUNCTION "public"."protect_code_column"();

ALTER TABLE ONLY "public"."ca_job_requisitions" ADD CONSTRAINT "fk_job_req_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_job_requisitions" ADD CONSTRAINT "fk_job_req_hm" FOREIGN KEY ("hiring_manager_id") REFERENCES "public"."ca_users"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."ca_job_requisitions" ADD CONSTRAINT "fk_job_req_owner" FOREIGN KEY ("owner_user_id") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_job_requisitions" ADD CONSTRAINT "fk_job_req_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_job_requisitions" ADD CONSTRAINT "fk_job_requisitions_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
CREATE OR REPLACE TRIGGER "trig_job_req_updated_at" BEFORE UPDATE ON "public"."ca_job_requisitions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
CREATE OR REPLACE TRIGGER "trig_protect_job_requisitions_code" BEFORE UPDATE ON "public"."ca_job_requisitions" FOR EACH ROW EXECUTE FUNCTION "public"."protect_code_column"();

CREATE OR REPLACE TRIGGER "trig_modules_updated_at" BEFORE UPDATE ON "public"."ca_modules" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_notes" ADD CONSTRAINT "fk_notes_author" FOREIGN KEY ("author_id") REFERENCES "public"."ca_users"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."ca_notes" ADD CONSTRAINT "fk_notes_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
CREATE OR REPLACE TRIGGER "trig_notes_updated_at" BEFORE UPDATE ON "public"."ca_notes" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_notifications" ADD CONSTRAINT "fk_notifications_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY "public"."ca_notifications" ADD CONSTRAINT "fk_notifications_user" FOREIGN KEY ("user_id") REFERENCES "public"."ca_users"("id") ON DELETE CASCADE;
CREATE OR REPLACE TRIGGER "trig_notifications_updated_at" BEFORE UPDATE ON "public"."ca_notifications" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_offers" ADD CONSTRAINT "fk_offers_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_offers" ADD CONSTRAINT "fk_offers_org" FOREIGN KEY ("org_id") REFERENCES "public"."ca_organisations"("id") ON DELETE CASCADE NOT VALID;
CREATE OR REPLACE TRIGGER "trig_offers_updated_at" BEFORE UPDATE ON "public"."ca_offers" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."ca_roles"("id") ON DELETE CASCADE;
CREATE OR REPLACE TRIGGER "trig_role_permissions_updated_at" BEFORE UPDATE ON "public"."ca_role_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

CREATE OR REPLACE TRIGGER "trig_roles_updated_at" BEFORE UPDATE ON "public"."ca_roles" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_status_history" ADD CONSTRAINT "fk_status_history_changed_by" FOREIGN KEY ("changed_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."ca_tags" ADD CONSTRAINT "fk_tags_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ca_tags" ADD CONSTRAINT "fk_tags_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
CREATE OR REPLACE TRIGGER "trig_tags_updated_at" BEFORE UPDATE ON "public"."ca_tags" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_tasks" ADD CONSTRAINT "fk_tasks_submitted_by" FOREIGN KEY ("submitted_by") REFERENCES "public"."ca_users"("id") ON DELETE SET NULL;
CREATE OR REPLACE TRIGGER "trig_tasks_updated_at" BEFORE UPDATE ON "public"."ca_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_user_meeting_integrations" ADD CONSTRAINT "user_meeting_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."ca_users"("id") ON DELETE CASCADE;
CREATE OR REPLACE TRIGGER "trig_user_meeting_integrations_updated_at" BEFORE UPDATE ON "public"."ca_user_meeting_integrations" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

ALTER TABLE ONLY "public"."ca_user_roles" ADD CONSTRAINT "fk_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "public"."ca_users"("id") ON DELETE CASCADE;

CREATE OR REPLACE TRIGGER "trig_users_updated_at" BEFORE UPDATE ON "public"."ca_users" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();
