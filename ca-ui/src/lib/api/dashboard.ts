import { apiClient } from './client';

export const DashboardService = {
  getStats: async () => {
    const { data } = await apiClient.get<any>('/dashboard/stats');
    return data;
  },
  getActivity: async () => {
    const { data } = await apiClient.get<any[]>('/dashboard/activity');
    return data;
  },
};
