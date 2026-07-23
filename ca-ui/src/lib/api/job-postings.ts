import { apiClient } from './client';
import {
  JobPosting,
  CreateJobPostingRequest,
  UpdateJobPostingRequest,
} from '../../types/job-postings';

export const jobPostingsApi = {
  getJobPostings: async (params?: { search?: string; jd_id?: string }) => {
    const { data } = await apiClient.get<JobPosting[]>('/job-postings', { params });
    return data;
  },

  getJobPosting: async (id: string) => {
    const { data } = await apiClient.get<JobPosting>(`/job-postings/${id}`);
    return data;
  },

  createJobPosting: async (payload: CreateJobPostingRequest) => {
    const { data } = await apiClient.post<JobPosting>('/job-postings', payload);
    return data;
  },

  updateJobPosting: async (id: string, payload: UpdateJobPostingRequest) => {
    const { data } = await apiClient.patch<JobPosting>(`/job-postings/${id}`, payload);
    return data;
  },

  deleteJobPosting: async (id: string) => {
    const { data } = await apiClient.delete<{ message: string }>(`/job-postings/${id}`);
    return data;
  },
};
