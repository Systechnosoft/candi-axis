import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../infrastructure/database/database.module';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private async getConfig(): Promise<{
    clientId: string;
    clientSecret: string;
    tenantId: string;
  }> {
    try {
      const dbRes = await this.pool.query(
        `SELECT config_json, encrypted_credentials_json 
         FROM public.ca_interview_provider_configurations 
         WHERE provider = 'MICROSOFT_TEAMS' AND is_active = true LIMIT 1`,
      );
      if (dbRes.rows.length > 0) {
        const config = dbRes.rows[0].config_json || {};
        const creds = dbRes.rows[0].encrypted_credentials_json || {};
        return {
          clientId: config.client_id || creds.client_id,
          clientSecret: config.client_secret || creds.client_secret,
          tenantId: config.tenant_id || creds.tenant_id,
        };
      }
    } catch (dbErr) {
      this.logger.error(
        `Failed to fetch MICROSOFT_TEAMS config from DB: ${dbErr.message}`,
      );
    }

    throw new BadRequestException(
      'Microsoft Teams integration is not configured or activated.',
    );
  }

  private async getAccessToken(
    tenantId: string,
    clientId: string,
    clientSecret: string,
  ): Promise<string> {
    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'client_credentials');

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      this.logger.error(`MS Teams token error: ${errorText}`);
      throw new BadRequestException(
        'Failed to authenticate with Microsoft Graph. Please check your App credentials and Tenant ID.',
      );
    }

    const data = await res.json();
    return data.access_token;
  }

  async generateMeetingLink(
    atsUserId: string,
  ): Promise<{ meetingLink: string; externalEventId: string }> {
    const { clientId, clientSecret, tenantId } = await this.getConfig();
    if (!clientId || !clientSecret || !tenantId) {
      throw new BadRequestException(
        'Microsoft Teams is missing configuration fields.',
      );
    }

    // Get user email to act as UPN (Organizer)
    const userRes = await this.pool.query(
      `SELECT email FROM ca_users WHERE id = $1`,
      [atsUserId],
    );
    if (userRes.rows.length === 0) {
      throw new BadRequestException('User not found.');
    }
    const upn = userRes.rows[0].email;

    const token = await this.getAccessToken(tenantId, clientId, clientSecret);

    const startDateTime = new Date();
    startDateTime.setHours(startDateTime.getHours() + 1);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);

    const payload = {
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      subject: 'Interview (Pending)',
    };

    const meetingUrl = `https://graph.microsoft.com/v1.0/users/${upn}/onlineMeetings`;
    const res = await fetch(meetingUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      this.logger.error(`Graph API meeting error: ${errorText}`);
      if (res.status === 403 || res.status === 401) {
        throw new BadRequestException(
          'Microsoft Teams permission denied. Ensure OnlineMeetings.ReadWrite.All Application permission is granted with admin consent, and Application Access Policy is configured.',
        );
      }
      throw new BadRequestException(
        `Failed to create Microsoft Teams meeting. Ensure user ${upn} exists in your Microsoft 365 tenant.`,
      );
    }

    const meeting = await res.json();
    return {
      meetingLink: meeting.joinWebUrl,
      externalEventId: meeting.id,
    };
  }
}
