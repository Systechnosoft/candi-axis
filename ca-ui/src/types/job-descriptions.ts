export interface JobDescription {
  id: string;
  requisition_id?: string;
  requisition_title?: string;
  requisition_code?: string;
  title: string;
  code: string | null;
  location: string | null;
  work_mode: string | null;
  employment_type: string | null;
  exp_min_months: number | null;
  exp_max_months: number | null;
  must_have_text: string | null;
  nice_to_have_text: string | null;
  job_summary: string | null;
  responsibilities_text: string | null;
  status: 'draft' | 'open' | 'on_hold' | 'closed';
  owner_user_id: string | null;
  published_internal_at: string | null;
  created_at: string;
  updated_at: string;
  updated_by_name?: string | null;
}

export interface CreateJobDescriptionRequest {
  requisition_id?: string;
  title: string;
  code?: string;
  location?: string;
  work_mode?: string;
  employment_type?: string;
  exp_min_months?: number;
  exp_max_months?: number;
  must_have_text?: string;
  nice_to_have_text?: string;
  job_summary?: string;
  responsibilities_text?: string;
  status?: string;
  owner_user_id?: string;
}

export type UpdateJobDescriptionRequest = Partial<CreateJobDescriptionRequest>;

export interface UpdateJobDescriptionStatusRequest {
  status: string;
}

export interface RequisitionOption {
  id: string;
  code: string;
  title: string;
}



export interface CandidateMatch {
  candidate_id: string;
  full_name: string;
  past_role: string;          // title of the job they previously applied to
  similarity_score: number;   // 0–100, how similar that JD was to current
  confidence: 'high' | 'medium' | 'low';
  current_ctc?: number;
  expected_ctc?: number;
  notice_period_days?: number;
  skills: string[];           // top skills from parsed resume
  overall_match_score: number; // 0–10, used by CircularProgressRing (Day 3)
}

export interface FindMatchesResponse {
  jd_id: string;
  matches: CandidateMatch[];
  total: number;
}
