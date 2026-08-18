import { google } from 'googleapis';
import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import * as crypto from 'crypto';
import { PG_POOL } from '../../../infrastructure/database/database.module';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly configService: ConfigService,
  ) {}

  private async getOAuthClient(): Promise<any> {
    // Load config from database configurations (saved by Super Admin in frontend settings)
    let clientId: string | undefined;
    let clientSecret: string | undefined;
    let redirectUri: string | undefined;

    try {
      const dbRes = await this.pool.query(
        `SELECT config_json, encrypted_credentials_json 
         FROM public.ca_interview_provider_configurations 
         WHERE provider = 'GOOGLE_MEET' AND is_active = true LIMIT 1`,
      );
      if (dbRes.rows.length > 0) {
        const config = dbRes.rows[0].config_json || {};
        const creds = dbRes.rows[0].encrypted_credentials_json || {};
        clientId = config.client_id || creds.client_id;
        clientSecret = config.client_secret || creds.client_secret;
        redirectUri = config.redirect_uri || creds.redirect_uri;
      }
    } catch (dbErr) {
      this.logger.error(
        `Failed to fetch GOOGLE_MEET config from DB: ${dbErr.message}`,
      );
    }

    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException(
        'Google Calendar API integration is not configured. Please save and activate Google Meet configuration in Admin settings.',
      );
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  // Generate OAuth Auth URL
  async getAuthUrl(atsUserId: string): Promise<string> {
    const oauth2Client = await this.getOAuthClient();
    const scope =
      this.configService.get<string>('GOOGLE_CALENDAR_SCOPE') ||
      'https://www.googleapis.com/auth/calendar.events';

    return oauth2Client.generateAuthUrl({
      access_type: 'offline', // crucial to get refresh token
      prompt: 'consent', // ensures refresh token is sent on every connect
      scope: [scope, 'https://www.googleapis.com/auth/userinfo.email'],
      state: atsUserId, // secure verification of callback
    });
  }

  // Exchange auth code for tokens and save
  async handleCallback(code: string, atsUserId: string): Promise<void> {
    if (!atsUserId) {
      throw new BadRequestException('User ID (state) is missing.');
    }

    const oauth2Client = await this.getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      // Check if we already have a refresh token for this user
      const existing = await this.getConnectionStatus(atsUserId);
      if (!existing.connected) {
        throw new BadRequestException(
          'Failed to retrieve refresh token. If you previously connected, please disconnect and try again.',
        );
      }
      // If we already have it, we might only get an access token, so we reuse the refresh token.
      // But since we pass `prompt: 'consent'`, Google should always provide a refresh token.
    }

    // Let's get user email from profile
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    let email = '';
    try {
      const userInfo = await oauth2.userinfo.get();
      email = userInfo.data.email || '';
    } catch (err) {
      this.logger.warn(
        `Could not retrieve user email from Google API: ${err.message}`,
      );
    }

    const encryptedRefreshToken = tokens.refresh_token
      ? this.encrypt(tokens.refresh_token)
      : null;
    const scopes = tokens.scope ? tokens.scope.split(' ') : null;
    const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    // Fetch user's org_id for user_calendar_integrations table constraint
    const userRes = await this.pool.query(
      `SELECT org_id FROM public.ca_users WHERE id = $1 LIMIT 1`,
      [atsUserId],
    );
    let orgId = userRes.rows[0]?.org_id || null;

    if (!orgId) {
      const fallbackRes = await this.pool.query(
        `SELECT id FROM public.ca_organisations ORDER BY created_at ASC LIMIT 1`,
      );
      orgId = fallbackRes.rows[0]?.id || null;
    }

    if (encryptedRefreshToken) {
      await this.pool.query(
        `INSERT INTO ca_user_calendar_integrations (org_id, user_id, provider, email, access_token, refresh_token, expiry_date, scopes, is_active, updated_at)
         VALUES ($1, $2, 'GOOGLE', $3, $4, $5, $6, $7, true, now())
         ON CONFLICT (user_id, provider) 
         DO UPDATE SET email = $3, access_token = $4, refresh_token = $5, expiry_date = $6, scopes = $7, is_active = true, updated_at = now()`,
        [
          orgId,
          atsUserId,
          email,
          tokens.access_token || null,
          encryptedRefreshToken,
          expiryDate,
          scopes,
        ],
      );
    } else {
      // update access token only if refresh token wasn't returned
      await this.pool.query(
        `UPDATE ca_user_calendar_integrations 
         SET email = COALESCE(email, $2), access_token = $3, expiry_date = $4, scopes = COALESCE(scopes, $5), is_active = true, updated_at = now()
         WHERE user_id = $1 AND provider = 'GOOGLE'`,
        [atsUserId, email, tokens.access_token || null, expiryDate, scopes],
      );
    }
  }

  // Get status
  async getConnectionStatus(
    atsUserId: string,
  ): Promise<{ connected: boolean; email?: string }> {
    const res = await this.pool.query(
      `SELECT email, is_active FROM ca_user_calendar_integrations WHERE user_id = $1 AND provider = 'GOOGLE'`,
      [atsUserId],
    );

    if (res.rows.length === 0 || !res.rows[0].is_active) {
      return { connected: false };
    }

    return { connected: true, email: res.rows[0].email };
  }

  // Disconnect
  async disconnect(atsUserId: string): Promise<void> {
    await this.pool.query(
      `UPDATE ca_user_calendar_integrations SET is_active = false, updated_at = now() WHERE user_id = $1 AND provider = 'GOOGLE'`,
      [atsUserId],
    );
  }

  // Pre-generate a Google Meet link
  async preGenerateMeetLink(
    atsUserId: string,
  ): Promise<{ meetingLink: string; externalEventId: string }> {
    const integrationRes = await this.pool.query(
      `SELECT refresh_token FROM ca_user_calendar_integrations WHERE user_id = $1 AND provider = 'GOOGLE' AND is_active = true LIMIT 1`,
      [atsUserId]
    );

    if (integrationRes.rows.length === 0) {
      throw new BadRequestException(
        'Google Calendar integration not connected. Please connect Google Calendar first.',
      );
    }

    const encryptedRefreshToken = integrationRes.rows[0].refresh_token;
    const refreshToken = this.decrypt(encryptedRefreshToken);

    if (!refreshToken) {
      throw new BadRequestException(
        'Invalid calendar session. Please reconnect Google Calendar.',
      );
    }

    const oauth2Client = await this.getOAuthClient();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Create a temporary event 1 hour from now to get a Meet link
    const startDateTime = new Date();
    startDateTime.setHours(startDateTime.getHours() + 1);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);

    const event = {
      summary: 'Interview (Pending)',
      description: 'Google Meet link pre-generated by CandiAxis.',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'UTC',
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-pre-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
    });

    const eventData = response.data;
    const externalEventId = eventData.id || '';

    let meetingLink = '';
    if (eventData.conferenceData && eventData.conferenceData.entryPoints) {
      const meetEntryPoint = eventData.conferenceData.entryPoints.find(
        (ep: any) => ep.entryPointType === 'video',
      );
      if (meetEntryPoint) {
        meetingLink = meetEntryPoint.uri || '';
      }
    }

    if (!meetingLink) {
      throw new BadRequestException(
        'Google Calendar did not generate a Google Meet URL.',
      );
    }

    return {
      meetingLink,
      externalEventId,
    };
  }

  // Create Google Meet Invite
  async createGoogleMeetInterviewInvite(
    interviewId: string,
    meetingCreatedByUserId: string,
    externalCalendarEventId?: string,
  ): Promise<any> {
    // 1. Fetch interview details, candidate, and assigned interviewers
    const interviewRes = await this.pool.query(
      `SELECT i.*, a.candidate_id, c.email as candidate_email, c.first_name as candidate_first_name, c.last_name as candidate_last_name,
              j.title as job_title
       FROM ca_interviews i
       JOIN applications a ON i.application_id = a.id
       JOIN ca_candidates c ON a.candidate_id = c.id
       JOIN ca_job_postings j ON a.job_id = j.id
       WHERE i.id = $1`,
      [interviewId],
    );

    if (interviewRes.rows.length === 0) {
      throw new BadRequestException('Interview not found.');
    }

    const interview = interviewRes.rows[0];

    // 2. Fetch assigned interviewers emails
    const interviewersRes = await this.pool.query(
      `SELECT u.email, u.full_name as name 
       FROM ca_interview_assignments ia
       JOIN users u ON ia.interviewer_user_id = u.id
       WHERE ia.interview_id = $1`,
      [interviewId],
    );

    const interviewers = interviewersRes.rows;

    // 3. Load active Google Calendar Integration
    const integrationRes = await this.pool.query(
      `SELECT refresh_token FROM ca_user_calendar_integrations WHERE provider = 'GOOGLE' AND is_active = true LIMIT 1`,
    );

    if (integrationRes.rows.length === 0) {
      throw new BadRequestException(
        'Google Calendar integration not connected or active. Please connect Google Calendar in the database settings.',
      );
    }

    const encryptedRefreshToken = integrationRes.rows[0].refresh_token;
    const refreshToken = this.decrypt(encryptedRefreshToken);

    if (!refreshToken) {
      throw new BadRequestException(
        'Invalid calendar session. Please reconnect Google Calendar.',
      );
    }

    const oauth2Client = await this.getOAuthClient();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Prepare attendees list
    const attendees = [
      {
        email: interview.candidate_email,
        displayName: `${interview.candidate_first_name} ${interview.candidate_last_name}`,
      },
    ];

    interviewers.forEach((interviewer: any) => {
      attendees.push({
        email: interviewer.email,
        displayName: interviewer.name,
      });
    });

    const startDateTime = new Date(interview.scheduled_start_utc);
    const duration = interview.duration_mins || 60;
    const endDateTime = new Date(
      startDateTime.getTime() + duration * 60 * 1000,
    );

    const event = {
      summary: `Interview: ${interview.candidate_first_name} ${interview.candidate_last_name} - ${interview.job_title}`,
      description: `Interview scheduled on Systechnosoft ATS.\nPosition: ${interview.job_title}\nCandidate: ${interview.candidate_first_name} ${interview.candidate_last_name}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees,
      conferenceData: {
        createRequest: {
          requestId: `meet-${interviewId}-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    try {
      // Update sync status to IN_PROGRESS
      await this.pool.query(
        `UPDATE ca_interviews SET calendar_sync_status = 'IN_PROGRESS', calendar_sync_error = NULL WHERE id = $1`,
        [interviewId],
      );

      // Update event if pre-generated, otherwise insert
      let response;
      if (externalCalendarEventId) {
        // If event is pre-generated, description/summary update does not need conferenceData creation request
        const updateEvent: any = { ...event };
        delete updateEvent.conferenceData;

        response = await calendar.events.update({
          calendarId: 'primary',
          eventId: externalCalendarEventId,
          requestBody: updateEvent,
          sendUpdates: 'all',
        });
      } else {
        response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: event,
          conferenceDataVersion: 1,
          sendUpdates: 'all',
        });
      }

      const eventData = response.data;
      const externalEventId = eventData.id;
      const calendarEventLink = eventData.htmlLink;

      // Get meeting/Meet link
      let meetingLink = '';
      if (eventData.conferenceData && eventData.conferenceData.entryPoints) {
        const meetEntryPoint = eventData.conferenceData.entryPoints.find(
          (ep: any) => ep.entryPointType === 'video',
        );
        if (meetEntryPoint) {
          meetingLink = meetEntryPoint.uri || '';
        }
      }

      if (!meetingLink) {
        throw new Error('Google Calendar did not generate a Google Meet URL.');
      }

      // Update interview record with Google Meet link and event ID
      await this.pool.query(
        `UPDATE ca_interviews 
         SET meeting_provider = 'GOOGLE_MEET',
             meeting_link = $2,
             external_calendar_event_id = $3,
             calendar_event_link = $4,
             calendar_sync_status = 'SYNCED',
             calendar_sync_error = NULL,
             invitation_sent_at = now(),
             meeting_created_by = $5,
             meeting_created_at = now()
         WHERE id = $1`,
        [
          interviewId,
          meetingLink,
          externalEventId,
          calendarEventLink,
          meetingCreatedByUserId,
        ],
      );

      return {
        success: true,
        meetingLink,
        calendarEventLink,
        externalEventId,
      };
    } catch (error) {
      this.logger.error(
        `Error creating Google Calendar Meet event: ${error.message}`,
      );

      // Update interview status to SYNC_FAILED
      await this.pool.query(
        `UPDATE ca_interviews 
         SET calendar_sync_status = 'SYNC_FAILED', 
             calendar_sync_error = $2
         WHERE id = $1`,
        [interviewId, error.message],
      );

      throw error;
    }
  }

  // Encryption helper methods matching admin settings pattern
  private getEncryptionKey(): Buffer {
    const secret =
      this.configService.get<string>('SUPABASE_JWT_SECRET') ||
      'ats-default-encryption-secret-key-32-chars';
    return crypto.createHash('sha256').update(secret).digest();
  }

  private encrypt(text: string): string {
    if (!text) return '';
    const iv = crypto.randomBytes(16);
    const key = this.getEncryptionKey();
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    if (!encryptedText) return '';
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return encryptedText;
    try {
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const key = this.getEncryptionKey();
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      this.logger.error('Failed to decrypt Google refresh token:', err);
      return '';
    }
  }
}
