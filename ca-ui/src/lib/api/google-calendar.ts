import { apiClient } from './client';

export interface GoogleConnectionStatus {
  connected: boolean;
  email?: string;
}

export const GoogleCalendarService = {
  getConnectionStatus: async (): Promise<GoogleConnectionStatus> => {
    const { data } = await apiClient.get<GoogleConnectionStatus>('/api/integrations/google/status');
    return data;
  },

  getAuthUrl: async (): Promise<{ url: string }> => {
    const { data } = await apiClient.get<{ url: string }>('/api/integrations/google/auth-url');
    return data;
  },

  disconnect: async (): Promise<{ success: boolean }> => {
    const { data } = await apiClient.post<{ success: boolean }>('/api/integrations/google/disconnect');
    return data;
  },

  generateMeetLink: async (): Promise<{ meetingLink: string; externalEventId: string }> => {
    const { data } = await apiClient.post<{ meetingLink: string; externalEventId: string }>('/api/integrations/google/generate-meet-link');
    return data;
  },
};
