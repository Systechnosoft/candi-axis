import { apiClient } from './client';

export const AdminService = {
  getAiConfig: async () => {
    const { data } = await apiClient.get<any>('/admin/settings/ai');
    return data;
  },
  updateAiConfig: async (payload: { 
    provider: string; 
    custom_api_key?: string;
    base_url?: string;
    model?: string;
    keys?: {
      id?: string;
      key: string;
      isNew?: boolean;
      status?: 'active' | 'rate_limited' | 'quota_exhausted' | 'invalid' | 'disabled';
    }[];
  }) => {
    const { data } = await apiClient.patch<any>('/admin/settings/ai', payload);
    return data;
  },
  clearApiKey: async (provider: string) => {
    const { data } = await apiClient.delete<any>(`/admin/settings/ai/key/${provider}`);
    return data;
  },
  fetchModels: async (payload: { provider: string; api_key?: string }) => {
    const { data } = await apiClient.post<string[]>('/admin/settings/ai/models', payload);
    return data;
  },
  getActiveAiProvider: async () => {
    const { data } = await apiClient.get<any>('/admin/settings/ai/active');
    return data;
  },
  getScoringWeights: async () => {
    const { data } = await apiClient.get<Record<string, number> | null>('/admin/settings/scoring-weights');
    return data;
  },
  updateScoringWeights: async (weights: Record<string, number>) => {
    const { data } = await apiClient.patch<any>('/admin/settings/scoring-weights', weights);
    return data;
  },
  getConfigurations: async () => {
    const { data } = await apiClient.get<any>('/admin/settings/configurations');
    return data;
  },
  getProviders: async () => {
    const { data } = await apiClient.get<any[]>('/admin/settings/providers');
    return data;
  },
  saveProviderConfig: async (payload: any) => {
    const { data } = await apiClient.post<any>('/admin/settings/configurations', payload);
    return data;
  },
  testProviderConfig: async (id: string) => {
    const { data } = await apiClient.post<any>(`/admin/settings/configurations/${id}/test`);
    return data;
  },
  activateProviderConfig: async (id: string) => {
    const { data } = await apiClient.post<any>(`/admin/settings/configurations/${id}/activate`);
    return data;
  },
  deactivateProviderConfig: async (id: string) => {
    const { data } = await apiClient.post<any>(`/admin/settings/configurations/${id}/deactivate`);
    return data;
  },
  setDefaultProviderConfig: async (id: string) => {
    const { data } = await apiClient.post<any>(`/admin/settings/configurations/${id}/default`);
    return data;
  }
};

