import { apiClient } from './client';

export const InterviewsService = {
  getInterviews: async (params?: { status?: string; search?: string }) => {
    const { data } = await apiClient.get<any[]>('/interviews', { params });
    return data;
  },

  scheduleInterview: async (payload: any) => {
    const { data } = await apiClient.post<any>('/interviews', payload);
    return data;
  },

  createGoogleMeetInvite: async (interviewId: string) => {
    const { data } = await apiClient.post<any>(`/interviews/${interviewId}/create-google-meet-invite`);
    return data;
  },
};
