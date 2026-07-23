import { apiClient } from './client';
import {
  JobDescription,
  CreateJobDescriptionRequest,
  UpdateJobDescriptionRequest,
  UpdateJobDescriptionStatusRequest,
  RequisitionOption,
  FindMatchesResponse,
  CandidateMatch,
} from '../../types/job-descriptions';

export const jobDescriptionsApi = {
  getJobDescriptions: async (params?: { requisition_id?: string; status?: string; search?: string }) => {
    const { data } = await apiClient.get<JobDescription[]>('/job-descriptions', { params });
    return data;
  },

  getJobDescription: async (id: string) => {
    const { data } = await apiClient.get<JobDescription>(`/job-descriptions/${id}`);
    return data;
  },

  createJobDescription: async (payload: CreateJobDescriptionRequest) => {
    const { data } = await apiClient.post<JobDescription>('/job-descriptions', payload);
    return data;
  },

  updateJobDescription: async (id: string, payload: UpdateJobDescriptionRequest) => {
    const { data } = await apiClient.patch<JobDescription>(`/job-descriptions/${id}`, payload);
    return data;
  },

  updateJobDescriptionStatus: async (id: string, payload: UpdateJobDescriptionStatusRequest) => {
    const { data } = await apiClient.patch<JobDescription>(`/job-descriptions/${id}/status`, payload);
    return data;
  },

  deleteJobDescription: async (id: string) => {
    const { data } = await apiClient.delete<{ message: string }>(`/job-descriptions/${id}`);
    return data;
  },

  getRequisitionOptions: async () => {
    const { data } = await apiClient.get<RequisitionOption[]>('/job-descriptions/options/requisitions');
    return data;
  },

 
  findMatches: async (jdId: string): Promise<FindMatchesResponse> => {
    const { data } = await apiClient.get<FindMatchesResponse>(
      `/job-descriptions/${jdId}/find-matches`
    );
    return data;
  },

  getStoredMatches: async (jdId: string): Promise<FindMatchesResponse> => {
    const { data } = await apiClient.get<FindMatchesResponse>(
      `/job-descriptions/${jdId}/stored-matches`
    );
    return data;
  },

  rematch: async (jdId: string): Promise<FindMatchesResponse> => {
    const { data } = await apiClient.post<FindMatchesResponse>(
      `/job-descriptions/${jdId}/rematch`
    );
    return data;
  },
};

export const getJobMatches = async (jobId: string): Promise<CandidateMatch[]> => {
  const res = await apiClient.get<FindMatchesResponse>(
    `/job-descriptions/${jobId}/find-matches`
  );

  const matches = res.data.matches || [];

  return matches.map((item: any): CandidateMatch => ({
    ...item,
    candidate_id: String(item.candidate_id),
  }));
};

export const getStoredJobMatches = async (jobId: string): Promise<CandidateMatch[]> => {
  const res = await apiClient.get<FindMatchesResponse>(
    `/job-descriptions/${jobId}/stored-matches`
  );

  const matches = res.data.matches || [];

  return matches.map((item: any): CandidateMatch => ({
    ...item,
    candidate_id: String(item.candidate_id),
  }));
};

export const rematchJob = async (jobId: string): Promise<CandidateMatch[]> => {
  const res = await apiClient.post<FindMatchesResponse>(
    `/job-descriptions/${jobId}/rematch`
  );

  const matches = res.data.matches || [];

  return matches.map((item: any): CandidateMatch => ({
    ...item,
    candidate_id: String(item.candidate_id),
  }));
};