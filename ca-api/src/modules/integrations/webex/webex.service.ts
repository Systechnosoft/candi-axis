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
export class WebexService {
  private readonly logger = new Logger(WebexService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly adminSettingsService: AdminSettingsService,
  ) {}

  private async getConfig(): Promise<{
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  }> {
    try {
      const dbRes = await this.pool.query(
        `SELECT config_json, encrypted_credentials_json 
         FROM public.ca_interview_provider_configurations 
         WHERE provider = 'CISCO_WEBEX' AND is_active = true LIMIT 1`,
      );
      if (dbRes.rows.length > 0) {
        const config = dbRes.rows[0].config_json || {};
        const creds = dbRes.rows[0].encrypted_credentials_json || {};
        
        let secret = '';
        if (creds.client_secret) {
          secret = this.adminSettingsService.decrypt(creds.client_secret as string);
        } else if (config.client_secret && config.client_secret !== '********') {
          secret = config.client_secret;
        }

        let refreshToken = '';
        if (creds.refresh_token) {
          refreshToken = this.adminSettingsService.decrypt(creds.refresh_token as string);
        } else if (config.refresh_token && config.refresh_token !== '********') {
          refreshToken = config.refresh_token;
        }

        return {
          clientId: (config.client_id || creds.client_id || '').trim(),
          clientSecret: (secret || '').trim(),
          refreshToken: (refreshToken || '').trim(),
        };
      }
    } catch (dbErr) {
      this.logger.error(
        `Failed to fetch CISCO_WEBEX config from DB: ${dbErr.message}`,
      );
    }

    throw new BadRequestException(
      'Cisco Webex integration is not configured or activated.',
    );
  }

  private async getAccessToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string,
  ): Promise<string> {
    const url = 'https://webexapis.com/v1/access_token';
    const bodyString = `grant_type=refresh_token&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&refresh_token=${encodeURIComponent(refreshToken)}`;

    this.logger.debug(`Webex Token Request Params: client_id=${clientId}, grant_type=refresh_token`);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyString,
    });

    if (!res.ok) {
      const errorText = await res.text();
      this.logger.error(`Webex token error: ${errorText}`);
      
      let errorMsg = errorText;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.message) {
          errorMsg = parsed.message;
        }
      } catch (e) {}

      throw new BadRequestException(
        `Failed to authenticate with Cisco Webex: ${errorMsg}. Please verify your Refresh Token in the Admin Settings.`,
      );
    }

    const data = await res.json();
    return data.access_token;
  }

  async generateMeetingLink(): Promise<{
    meetingLink: string;
    externalEventId: string;
  }> {
    const { clientId, clientSecret, refreshToken } = await this.getConfig();
    if (!clientId || !clientSecret || !refreshToken) {
      throw new BadRequestException(
        'Cisco Webex is missing configuration fields (including Refresh Token / Access Token).',
      );
    }

    const startDateTime = new Date();
    startDateTime.setHours(startDateTime.getHours() + 1);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);

    const payload = {
      title: 'Interview (Pending)',
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
    };

    const meetingUrl = 'https://webexapis.com/v1/meetings';

    const tryCreateMeeting = async (token: string) => {
      return fetch(meetingUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    };

    // First try: Assume the user provided a Personal Access Token directly in the Refresh Token field
    let res = await tryCreateMeeting(refreshToken);

    // If it fails with 401 (Unauthorized), it might be a real Refresh Token, so let's exchange it
    if (res.status === 401) {
      this.logger.debug('Token rejected as Access Token. Attempting to exchange as Refresh Token...');
      const newToken = await this.getAccessToken(clientId, clientSecret, refreshToken);
      res = await tryCreateMeeting(newToken);
    }

    if (!res.ok) {
      const errorText = await res.text();
      this.logger.error(`Webex meeting error: ${errorText}`);
      
      let errorMsg = errorText;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.message) {
          errorMsg = parsed.message;
        }
      } catch (e) {}

      throw new BadRequestException(
        `Webex API Error: ${errorMsg}`,
      );
    }

    const meeting = await res.json();
    return {
      meetingLink: meeting.webLink,
      externalEventId: meeting.id,
    };
  }
}
