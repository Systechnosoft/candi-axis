import { apiClient } from './client';

export interface Application {
  id: string;
  candidate_id: string;
  candidate_name: string;
  jd_id: string;
  jd_title: string;
  stage: string;
  source: string;
  ai_score?: number;
  recruiter_name?: string;
  created_at: string;
}

export const ApplicationsService = {
  getApplications: async (params: any) => {
    const res = await apiClient.get('/applications', { params });
    return res.data;
  },

  getApplication: async (id: string) => {
    const res = await apiClient.get(`/applications/${id}`);
    return res.data;
  },

  createApplication: async (data: any) => {
    const res = await apiClient.post('/applications', data);
    return res.data;
  },

  updateStage: async (id: string, data: any) => {
    const res = await apiClient.patch(`/applications/${id}/stage`, data);
    return res.data;
  },

  refreshAiRating: async (id: string) => {
    const res = await apiClient.post(`/applications/${id}/refresh-ai-rating`);
    return res.data;
  },
};
