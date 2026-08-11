export interface ListResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CandidateEducation {
  id?: string;
  qualification_level?: string;
  degree?: string;
  field_of_study?: string;
  institution_name?: string;
  start_year?: string;
  end_year?: string;
  grade_or_percentage?: string;
  is_highest?: boolean;
}

export interface CandidateEmployment {
  id?: string;
  company_name: string;
  job_title?: string;
  employment_type?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  responsibilities_summary?: string;
}

export interface CandidateCertification {
  id?: string;
  certification_name: string;
  issuer?: string;
  issued_on?: string;
  expiry_on?: string;
  does_not_expire?: boolean;
  credential_id?: string;
  credential_url?: string;
}

export interface CandidateProject {
  id?: string;
  title: string;
  description?: string;
  technologies?: string;
  duration?: string;
  role?: string;
  project_url?: string;
}

export interface CandidateSocialLink {
  id?: string;
  link_type: string;
  url: string;
  is_primary?: boolean;
}

export interface Candidate {
  id: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  secondary_email?: string | null;
  phone?: string | null;
  secondary_phone?: string | null;
  location?: string | null;
  total_exp_months?: number | null;
  relevant_exp_months?: number | null;
  current_company?: string | null;
  current_designation?: string | null;
  notice_period_days?: number | null;
  current_ctc?: number | null;
  expected_ctc?: number | null;
  profile_summary?: string | null;
  source: string;
  status: string;
  created_at: string;
  updated_at: string;
  gap_details?: string | null;
  profile_score?: number | null;
  updated_by_name?: string | null;

  educations?: CandidateEducation[];
  employments?: CandidateEmployment[];
  certifications?: CandidateCertification[];
  projects?: CandidateProject[];
  social_links?: CandidateSocialLink[];
  tags?: Array<{ id: string; name: string; type: string }>;
}

export interface UpdateCandidateRequest extends Partial<CreateCandidateManualRequest> {
  full_name?: string;
}

export interface CreateCandidateManualRequest {
  full_name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  secondary_email?: string;
  phone?: string;
  secondary_phone?: string;
  location?: string;
  total_exp_months?: number;
  relevant_exp_months?: number;
  current_company?: string;
  current_designation?: string;
  notice_period_days?: number;
  current_ctc?: number;
  expected_ctc?: number;
  profile_summary?: string;
  source?: string;
  educations?: CandidateEducation[];
  employments?: CandidateEmployment[];
  certifications?: CandidateCertification[];
  projects?: CandidateProject[];
  social_links?: CandidateSocialLink[];
  tags?: string[]; // array of tag IDs
  gap_details?: string;
  force?: boolean;
}

export interface CreateCandidateParsedRequest {
  document_id: string;
  parsed_json: Record<string, unknown>;
  parsed_text?: string;
  candidate_data?: CreateCandidateManualRequest;
  force?: boolean;
}

export interface RegisterDocumentRequest {
  document_type: string;
  original_file_name: string;
  storage_bucket: string;
  storage_key: string;
  mime_type: string;
  file_size_bytes?: number;
}

export interface DuplicateMatchResponse {
  message: string;
  duplicates: Array<{
    candidateId: string;
    matchLevel: 'high' | 'medium';
    confidenceScore: number;
    signals: Record<string, unknown>;
  }>;
}

export interface DocumentResponse {
  id: string;
  parse_status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  parsed_json: Record<string, unknown> | null;
  parse_error?: string | null;
  original_file_name: string;
}

// Frontend utility type for the Shared Form
export interface CandidateFormValues {
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  secondary_email: string;
  phone: string;
  secondary_phone: string;
  location: string;
  total_exp_months: string; // string for input handling, converted before submit
  relevant_exp_months: string;
  current_company: string;
  current_designation: string;
  notice_period_days: string;
  current_ctc: string;
  expected_ctc: string;
  profile_summary: string;
  educations: CandidateEducation[];
  employments: CandidateEmployment[];
  certifications: CandidateCertification[];
  projects: CandidateProject[];
  social_links: CandidateSocialLink[];
  tags: Array<{ id: string; name: string; type: string }>;
}
