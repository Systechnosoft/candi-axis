import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../infrastructure/database/database.module';

@Injectable()
export class ZoomService {
  private readonly logger = new Logger(ZoomService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private async getConfig(): Promise<{ clientId: string; clientSecret: string; accountId: string; hostEmail: string }> {
    try {
      const dbRes = await this.pool.query(
        `SELECT config_json, encrypted_credentials_json 
         FROM public.ca_interview_provider_configurations 
         WHERE provider = 'ZOOM' AND is_active = true LIMIT 1`,
      );
      if (dbRes.rows.length > 0) {
        const config = dbRes.rows[0].config_json || {};
        const creds = dbRes.rows[0].encrypted_credentials_json || {};
        return {
          clientId: config.client_id || creds.client_id,
          clientSecret: config.client_secret || creds.client_secret,
          accountId: config.account_id || creds.account_id,
          hostEmail: config.host_email || creds.host_email,
        };
      }
    } catch (dbErr) {
      this.logger.error(`Failed to fetch ZOOM config from DB: ${dbErr.message}`);
    }

    throw new BadRequestException('Zoom integration is not configured or activated.');
  }

  private async getAccessToken(accountId: string, clientId: string, clientSecret: string): Promise<string> {
    const url = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      this.logger.error(`Zoom token error: ${errorText}`);
      throw new BadRequestException('Failed to authenticate with Zoom. Please check your Server-to-Server credentials.');
    }

    const data = await res.json();
    return data.access_token;
  }

  async generateMeetingLink(): Promise<{ meetingLink: string; externalEventId: string }> {
    const { clientId, clientSecret, accountId, hostEmail } = await this.getConfig();
    if (!clientId || !clientSecret || !accountId || !hostEmail) {
      throw new BadRequestException('Zoom is missing configuration fields (including Host Email).');
    }

    const token = await this.getAccessToken(accountId, clientId, clientSecret);

    const payload = {
      topic: 'Interview (Pending)',
      type: 2, // Scheduled meeting
      duration: 30, // 30 minutes
      timezone: 'UTC',
    };

    const meetingUrl = `https://api.zoom.us/v2/users/${hostEmail}/meetings`;
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
      this.logger.error(`Zoom meeting error: ${errorText}`);
      throw new BadRequestException(`Failed to create Zoom meeting. Ensure host ${hostEmail} exists in your Zoom account.`);
    }

    const meeting = await res.json();
    return {
      meetingLink: meeting.join_url,
      externalEventId: meeting.id.toString(),
    };
  }
}
