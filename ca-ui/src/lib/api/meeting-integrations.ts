import { apiClient } from './client';

export interface UserIntegrationStatus {
  connected: boolean;
  email?: string;
}

export const MeetingIntegrationsService = {
  getConnectionStatus: async (): Promise<Record<string, UserIntegrationStatus>> => {
    const { data } = await apiClient.get<Record<string, UserIntegrationStatus>>('/meeting-integrations/status');
    return data;
  },

  getAuthUrl: async (provider: string): Promise<{ url: string }> => {
    const { data } = await apiClient.get<{ url: string }>(`/meeting-integrations/${provider}/auth-url`);
    return data;
  },

  disconnect: async (provider: string): Promise<{ success: boolean }> => {
    const { data } = await apiClient.delete<{ success: boolean }>(`/meeting-integrations/${provider}/disconnect`);
    return data;
  },

  generateMeetingLink: async (provider: string): Promise<{ meetingLink: string; externalEventId: string }> => {
    const routeProvider = provider.toLowerCase();
    const { data } = await apiClient.post<{ meetingLink: string; externalEventId: string }>(`/api/integrations/${routeProvider}/generate-meet-link`);
    return data;
  },
};
