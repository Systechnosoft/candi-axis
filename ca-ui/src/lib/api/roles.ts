import { apiClient } from './client';

export interface ModulePermission {
  module_id: string;
  module_code: string;
  module_name: string;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  role_type: string;
  level: number;
  org_id: string | null;
  is_system_role: boolean;
  is_editable: boolean;
  is_active: boolean;
  user_count?: number;
  permissions?: ModulePermission[];
  description?: string;
}

export interface Module {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module_group: string | null;
  sort_order: number;
  is_platform_only: boolean;
}

export const rolesApi = {
  getOrganisations: async () => {
    const res = await apiClient.get<{ data: any[] }>('/organisations?limit=200');
    return res.data.data;
  },

  getModules: async () => {
    const res = await apiClient.get<Module[]>('/roles/modules');
    return res.data;
  },

  getRoles: async (orgId?: string) => {
    const res = await apiClient.get<Role[]>('/roles', {
      params: orgId ? { org_id: orgId } : undefined,
    });
    return res.data;
  },

  getRole: async (id: string) => {
    const res = await apiClient.get<Role>(`/roles/${id}`);
    return res.data;
  },

  createRole: async (data: {
    name: string;
    description?: string;
    role_type: string;
    org_id?: string;
    level?: number;
    permissions: Array<{
      module_id: string;
      can_read: boolean;
      can_create: boolean;
      can_update: boolean;
      can_delete: boolean;
    }>;
  }) => {
    const res = await apiClient.post<Role>('/roles', data);
    return res.data;
  },

  updateRole: async (
    id: string,
    data: {
      name?: string;
      description?: string;
      role_type?: string;
      level?: number;
      permissions?: Array<{
        module_id: string;
        can_read: boolean;
        can_create: boolean;
        can_update: boolean;
        can_delete: boolean;
      }>;
    },
  ) => {
    const res = await apiClient.patch<any>(`/roles/${id}`, data);
    return res.data;
  },

  deleteRole: async (id: string) => {
    const res = await apiClient.delete<any>(`/roles/${id}`);
    return res.data;
  },
};
