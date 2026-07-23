import { apiClient } from './client';
import { Requisition, CreateRequisitionRequest, UpdateRequisitionRequest, RequisitionStatus } from '@/types/requisitions';

export const requisitionsApi = {
  getRequisitions: async (params?: { search?: string; status?: RequisitionStatus; department?: string; activeOnly?: string }) => {
    const { data } = await apiClient.get<Requisition[]>('/requisitions', { params });
    return data;
  },

  getRequisition: async (id: string) => {
    const { data } = await apiClient.get<Requisition>(`/requisitions/${id}`);
    return data;
  },

  createRequisition: async (payload: CreateRequisitionRequest) => {
    const { data } = await apiClient.post<Requisition>('/requisitions', payload);
    return data;
  },

  updateRequisition: async (id: string, payload: UpdateRequisitionRequest) => {
    const { data } = await apiClient.patch<Requisition>(`/requisitions/${id}`, payload);
    return data;
  },

  deleteRequisition: async (id: string) => {
    const { data } = await apiClient.delete<{ message: string }>(`/requisitions/${id}`);
    return data;
  },
};
