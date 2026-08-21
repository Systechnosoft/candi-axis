import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../infrastructure/database/database.module';

@Injectable()
export class WebexService {
  private readonly logger = new Logger(WebexService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private async getConfig(): Promise<{ clientId: string; clientSecret: string }> {
    try {
      const dbRes = await this.pool.query(
        `SELECT config_json, encrypted_credentials_json 
         FROM public.ca_interview_provider_configurations 
         WHERE provider = 'CISCO_WEBEX' AND is_active = true LIMIT 1`,
      );
      if (dbRes.rows.length > 0) {
        const config = dbRes.rows[0].config_json || {};
        const creds = dbRes.rows[0].encrypted_credentials_json || {};
        return {
          clientId: config.client_id || creds.client_id,
          clientSecret: config.client_secret || creds.client_secret,
        };
      }
    } catch (dbErr) {
      this.logger.error(`Failed to fetch CISCO_WEBEX config from DB: ${dbErr.message}`);
    }

    throw new BadRequestException('Cisco Webex integration is not configured or activated.');
  }

  private async getAccessToken(clientId: string, clientSecret: string): Promise<string> {
    const url = 'https://webexapis.com/v1/access_token';
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'client_credentials');

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      this.logger.error(`Webex token error: ${errorText}`);
      throw new BadRequestException('Failed to authenticate with Cisco Webex. Please check your Service App credentials.');
    }

    const data = await res.json();
    return data.access_token;
  }

  async generateMeetingLink(): Promise<{ meetingLink: string; externalEventId: string }> {
    const { clientId, clientSecret } = await this.getConfig();
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Cisco Webex is missing configuration fields.');
    }

    const token = await this.getAccessToken(clientId, clientSecret);

    const startDateTime = new Date();
    startDateTime.setHours(startDateTime.getHours() + 1);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);

    const payload = {
      title: 'Interview (Pending)',
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
    };

    const meetingUrl = 'https://webexapis.com/v1/meetings';
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
      this.logger.error(`Webex meeting error: ${errorText}`);
      throw new BadRequestException(`Failed to create Webex meeting. Ensure your Service App has meeting scopes.`);
    }

    const meeting = await res.json();
    return {
      meetingLink: meeting.webLink,
      externalEventId: meeting.id,
    };
  }
}
