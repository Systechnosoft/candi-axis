import { apiClient } from './client';

export interface Customer {
  id: string;
  customer_code: string;
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

export const CustomersService = {
  getCustomers: async (params?: { page?: number; limit?: number; search?: string }): Promise<ListResponse<Customer>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<ListResponse<Customer>>(`/customers${queryString}`);
    return response.data;
  },

  getCustomer: async (id: string): Promise<Customer> => {
    const response = await apiClient.get<Customer>(`/customers/${id}`);
    return response.data;
  },

  createCustomer: async (data: Partial<Customer>): Promise<Customer> => {
    const response = await apiClient.post<Customer>('/customers', data);
    return response.data;
  },

  updateCustomer: async (id: string, data: Partial<Customer>): Promise<Customer> => {
    const response = await apiClient.patch<Customer>(`/customers/${id}`, data);
    return response.data;
  },

  deactivateCustomer: async (id: string): Promise<void> => {
    await apiClient.delete(`/customers/${id}`);
  }
};
