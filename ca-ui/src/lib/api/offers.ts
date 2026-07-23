import { apiClient } from './client';

export const OffersService = {
  getOffers: async (params?: { search?: string }) => {
    const { data } = await apiClient.get<any[]>('/offers', { params });
    return data;
  },
  getPendingApplications: async () => {
    const { data } = await apiClient.get<any[]>('/offers/pending-applications');
    return data;
  },
  createOffer: async (payload: any) => {
    const { data } = await apiClient.post<any>('/offers', payload);
    return data;
  },
  updateStatus: async (id: string, status: string) => {
    const { data } = await apiClient.patch<any>(`/offers/${id}/status`, { status });
    return data;
  }
};
