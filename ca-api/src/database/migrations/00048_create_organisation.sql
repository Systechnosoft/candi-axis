-- 00048_create_organisation.sql
CREATE SEQUENCE IF NOT EXISTS org_code_seq START WITH 1;

CREATE TABLE IF NOT EXISTS public.organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_code VARCHAR(50) NOT NULL DEFAULT 'ORG-' || lpad(nextval('org_code_seq')::text, 3, '0'),
    name VARCHAR(150) NOT NULL,
    legal_name VARCHAR(200),
    primary_contact_name VARCHAR(150),
    primary_email_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    primary_phone_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    primary_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    website_url TEXT,
    industry VARCHAR(100),
    company_size VARCHAR(50),
    allowed_email_domains TEXT[] DEFAULT '{}',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT uq_organisations_org_code UNIQUE (org_code),
    CONSTRAINT chk_organisations_status CHECK (
        status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED')
    )
);

CREATE INDEX IF NOT EXISTS idx_organisations_status ON public.organisations(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_organisations_name ON public.organisations(name);
CREATE INDEX IF NOT EXISTS idx_organisations_deleted_at ON public.organisations(deleted_at);

-- Add foreign key constraints to all the tables referencing organisations
-- Using NOT VALID to skip validating existing rows (tables may have system-level entries without an org)
-- A subsequent VALIDATE CONSTRAINT call can be used when needed.
ALTER TABLE public.users ADD CONSTRAINT fk_users_org_id FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
ALTER TABLE public.roles ADD CONSTRAINT fk_roles_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
ALTER TABLE public.admin_settings ADD CONSTRAINT fk_admin_settings_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.tags ADD CONSTRAINT fk_tags_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.notes ADD CONSTRAINT fk_notes_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.addresses ADD CONSTRAINT fk_addresses_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.contacts ADD CONSTRAINT fk_contacts_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.documents ADD CONSTRAINT fk_documents_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.audit_logs ADD CONSTRAINT fk_audit_logs_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.status_history ADD CONSTRAINT fk_status_history_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.job_requisitions ADD CONSTRAINT fk_job_requisitions_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.job_descriptions ADD CONSTRAINT fk_job_descriptions_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.candidates ADD CONSTRAINT fk_candidates_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.candidate_educations ADD CONSTRAINT fk_candidate_educations_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.candidate_employments ADD CONSTRAINT fk_candidate_employments_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.candidate_certifications ADD CONSTRAINT fk_candidate_certifications_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.candidate_social_links ADD CONSTRAINT fk_candidate_social_links_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.duplicate_matches ADD CONSTRAINT fk_duplicate_matches_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.interviews ADD CONSTRAINT fk_interviews_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.interview_assignments ADD CONSTRAINT fk_interview_assignments_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.feedback_tasks ADD CONSTRAINT fk_feedback_tasks_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.feedback_submissions ADD CONSTRAINT fk_feedback_submissions_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.offers ADD CONSTRAINT fk_offers_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.job_candidate_matches ADD CONSTRAINT fk_job_candidate_matches_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.candidate_projects ADD CONSTRAINT fk_candidate_projects_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.job_postings ADD CONSTRAINT fk_job_postings_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.tasks ADD CONSTRAINT fk_tasks_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.user_calendar_integrations ADD CONSTRAINT fk_user_calendar_integrations_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.user_meeting_integrations ADD CONSTRAINT fk_user_meeting_integrations_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.interview_provider_configurations ADD CONSTRAINT fk_interview_provider_configurations_org FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE NOT VALID;