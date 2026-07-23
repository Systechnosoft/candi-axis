import { apiClient } from './client';
import { UserLookup, User, CreateUserRequest, UpdateUserRequest, UpdateUserStatusRequest } from '../../types/users';

export const usersApi = {
  getLookups: async () => {
    const { data } = await apiClient.get<UserLookup[]>('/users/lookups');
    return data;
  },

  getHiringManagers: async () => {
    const { data } = await apiClient.get<UserLookup[]>('/users/options/hiring-managers');
    return data;
  },

  getHrRecruiters: async () => {
    const { data } = await apiClient.get<UserLookup[]>('/users/options/hr-recruiters');
    return data;
  },

  getInterviewers: async () => {
    const { data } = await apiClient.get<UserLookup[]>('/users/options/interviewers');
    return data;
  },

  getUsers: async () => {
    const { data } = await apiClient.get<User[]>('/users');
    return data;
  },

  getUser: async (id: string) => {
    const { data } = await apiClient.get<User>(`/users/${id}`);
    return data;
  },

  createUser: async (payload: CreateUserRequest) => {
    const { data } = await apiClient.post<User>('/users', payload);
    return data;
  },

  updateUser: async (id: string, payload: UpdateUserRequest) => {
    const { data } = await apiClient.patch<User>(`/users/${id}`, payload);
    return data;
  },

  updateUserStatus: async (id: string, payload: UpdateUserStatusRequest) => {
    const { data } = await apiClient.patch<User>(`/users/${id}/status`, payload);
    return data;
  },

  deleteUser: async (id: string) => {
    const { data } = await apiClient.delete<{ success: boolean }>(`/users/${id}`);
    return data;
  },
};
