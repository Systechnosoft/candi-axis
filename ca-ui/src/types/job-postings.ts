export interface JobPosting {
  id: string;
  code?: string | null;
  name: string;
  description: string | null;
  jd_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  jd_title?: string | null;
  jd_code?: string | null;
  hr_ids?: string[] | null;
  interviewer_ids?: string[] | null;
  updated_by_name?: string | null;
}

export interface CreateJobPostingRequest {
  name: string;
  code?: string;
  description?: string;
  jd_id: string;
  is_active?: boolean;
  hr_ids?: string[];
  interviewer_ids?: string[];
}

export interface UpdateJobPostingRequest {
  name?: string;
  code?: string;
  description?: string;
  jd_id?: string;
  is_active?: boolean;
  hr_ids?: string[] | null;
  interviewer_ids?: string[] | null;
}
