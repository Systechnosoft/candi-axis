import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../infrastructure/database/database.module';

import { AdminSettingsService } from '../../admin/admin-settings.service';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly adminSettingsService: AdminSettingsService,
  ) {}

  private async getConfig(): Promise<{
    clientId: string;
    clientSecret: string;
    tenantId: string;
    schedulerUpn: string;
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
        let secret = '';
        if (creds.client_secret) {
          secret = this.adminSettingsService.decrypt(creds.client_secret as string);
        } else if (
          config.client_secret &&
          config.client_secret !== '********'
        ) {
          secret = config.client_secret;
        }

        return {
          clientId: config.client_id || creds.client_id,
          clientSecret: secret,
          tenantId: config.tenant_id || creds.tenant_id,
          schedulerUpn: config.scheduler_upn || creds.scheduler_upn || '',
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
    const { clientId, clientSecret, tenantId, schedulerUpn } = await this.getConfig();
    if (!clientId || !clientSecret || !tenantId) {
      throw new BadRequestException(
        'Microsoft Teams is missing configuration fields.',
      );
    }

    if (!schedulerUpn) {
      throw new BadRequestException(
        'Microsoft Teams Scheduler Email (UPN) is not configured. Please add it in Admin Settings.',
      );
    }

    const upn = schedulerUpn;

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
      
      let errorMsg = errorText;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error && parsed.error.message) {
          errorMsg = parsed.error.message;
        }
      } catch (e) {}

      if (res.status === 403 || res.status === 401) {
        throw new BadRequestException(
          `MS Teams Permission Denied: ${errorMsg}. (Did you run the PowerShell Application Access Policy script?)`,
        );
      }
      throw new BadRequestException(
        `Microsoft Graph Error: ${errorMsg}`,
      );
    }

    const meeting = await res.json();
    return {
      meetingLink: meeting.joinWebUrl,
      externalEventId: meeting.id,
    };
  }
}
