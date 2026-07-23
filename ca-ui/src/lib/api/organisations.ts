import { apiClient } from './client';

export interface Organisation {
  id: string;
  org_code: string;
  name: string;
  legal_name?: string;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  website_url?: string;
  industry?: string;
  company_size?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  allowed_email_domains: string[];
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ListResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const OrganisationsService = {
  getOrganisations: async (params?: { page?: number; limit?: number; search?: string }): Promise<ListResponse<Organisation>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<ListResponse<Organisation>>(`/organisations${queryString}`);
    return response.data;
  },

  getOrganisation: async (id: string): Promise<Organisation> => {
    const response = await apiClient.get<Organisation>(`/organisations/${id}`);
    return response.data;
  },

  createOrganisation: async (data: Partial<Organisation>): Promise<Organisation> => {
    const response = await apiClient.post<Organisation>('/organisations', data);
    return response.data;
  },

  updateOrganisation: async (id: string, data: Partial<Organisation>): Promise<Organisation> => {
    const response = await apiClient.patch<Organisation>(`/organisations/${id}`, data);
    return response.data;
  },

  deactivateOrganisation: async (id: string): Promise<void> => {
    await apiClient.delete(`/organisations/${id}`);
  }
};
