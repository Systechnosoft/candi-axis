import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { QueueService } from '../queue/queue.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { SendCalendarInviteJobPayload } from '../queue/queue.types';
import { GoogleCalendarService } from '../integrations/google-calendar/google-calendar.service';

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly queueService: QueueService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async findAll(params: { status?: string; search?: string }) {
    const { status, search } = params;

    let query = `
      SELECT 
        a.id as application_id,
        a.stage as application_stage,
        c.full_name as candidate_name,
        jd.title as jd_title,
        i.id as interview_id,
        i.round_no,
        i.round_type,
        i.scheduled_start_utc,
        i.status as interview_status,
        i.mode,
        creator.full_name as scheduled_by_name,
        (
          SELECT string_agg(u_int.full_name, ', ')
          FROM ca_interview_assignments ia
          JOIN ca_users u_int ON ia.interviewer_user_id = u_int.id
          WHERE ia.interview_id = i.id
        ) as interviewer_names
      FROM public.ca_candidate_job_stages a
      JOIN ca_candidates c ON a.candidate_id = c.id
      JOIN public.ca_job_postings jp ON a.job_posting_id = jp.id
      JOIN public.ca_job_descriptions jd ON jp.jd_id = jd.id
      LEFT JOIN ca_interviews i ON a.id = i.application_id AND i.is_deleted = false
      LEFT JOIN ca_users creator ON i.created_by = creator.id
      WHERE (a.stage = 'interviewing' OR i.id IS NOT NULL)
        AND a.deleted_at IS NULL
    `;

    const queryParams: any[] = [];
    let paramIdx = 1;

    if (status) {
      query += ` AND (i.status = $${paramIdx} OR a.stage = $${paramIdx})`;
      queryParams.push(status);
      paramIdx++;
    }

    if (search) {
      query += ` AND (c.full_name ILIKE $${paramIdx} OR jd.title ILIKE $${paramIdx})`;
      queryParams.push(`%${search}%`);
      paramIdx++;
    }

    query += ` ORDER BY i.scheduled_start_utc DESC NULLS LAST, a.created_at DESC`;

    const res = await this.pool.query(query, queryParams);
    return res.rows;
  }

  async scheduleInterview(actorUserId: string, dto: ScheduleInterviewDto) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const roundRes = await client.query(
        'SELECT COALESCE(MAX(round_no), 0) + 1 as next_round FROM ca_interviews WHERE application_id = $1 AND is_deleted = false',
        [dto.applicationId],
      );
      const nextRound = roundRes.rows[0].next_round;

      const userRes = await client.query(
        `SELECT org_id FROM public.ca_users WHERE id = $1`,
        [actorUserId],
      );
      let orgId = userRes.rows[0]?.org_id;
      if (!orgId) {
        const defaultOrgRes = await client.query(
          `SELECT id FROM public.ca_organisations ORDER BY created_at ASC LIMIT 1`,
        );
        orgId =
          defaultOrgRes.rows[0]?.id || '7af2ebf4-6888-4757-a585-bcd9115bb0da';
      }

      const insertInterviewQuery = `
        INSERT INTO ca_interviews (
          org_id, application_id, round_no, round_type, scheduled_start_utc, duration_mins, mode, location, meeting_link, status, created_by, outlook_status, external_calendar_event_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled', $10, 'pending', $11)
        RETURNING *
      `;
      const interviewValues = [
        orgId,
        dto.applicationId,
        nextRound,
        dto.roundType,
        dto.scheduledStartUtc,
        dto.durationMins || 60,
        dto.mode || 'online',
        dto.location || null,
        dto.meetingLink || null,
        actorUserId,
        dto.externalCalendarEventId || null,
      ];
      const interviewRes = await client.query(
        insertInterviewQuery,
        interviewValues,
      );
      const interview = interviewRes.rows[0];

      for (const interviewerId of dto.interviewerIds) {
        await client.query(
          `INSERT INTO ca_interview_assignments (org_id, interview_id, interviewer_user_id, assignment_status)
           VALUES ($1, $2, $3, 'invited')
           ON CONFLICT (interview_id, interviewer_user_id) DO NOTHING`,
          [orgId, interview.id, interviewerId],
        );
      }

      await client.query(
        `UPDATE public.ca_candidate_job_stages 
         SET sub_stage = 'interview_to_be_scheduled', updated_at = now()
         WHERE id = $1`,
        [dto.applicationId],
      );

      await client.query('COMMIT');

      if (dto.mode === 'online') {
        const integrationRes = await this.pool.query(
          `SELECT id FROM ca_user_calendar_integrations WHERE provider = 'GOOGLE' AND is_active = true LIMIT 1`,
        );
        if (integrationRes.rows.length > 0) {
          try {
            const meetData =
              await this.googleCalendarService.createGoogleMeetInterviewInvite(
                interview.id,
                actorUserId,
                dto.externalCalendarEventId,
              );
            // Fetch updated interview details with final meeting link
            const updatedRes = await this.pool.query(
              'SELECT * FROM ca_interviews WHERE id = $1',
              [interview.id],
            );
            if (updatedRes.rows.length > 0) {
              // Updated row captured — enqueue will pick up fresh meeting_link from DB
              void updatedRes.rows[0];
            }
          } catch (meetErr) {
            this.logger.error(
              `Failed to generate Google Meet invite: ${meetErr.message}`,
              meetErr.stack,
            );
          }
        }
      }

      try {
        await this.queueService.enqueue<SendCalendarInviteJobPayload>(
          QUEUE_NAMES.CALENDAR_INVITES,
          'send-calendar-invite',
          {
            interviewId: interview.id,
            emailSubject: dto.emailSubject,
            note: dto.note || undefined,
            actorUserId,
            ccUserIds: dto.ccUserIds || [],
            candidateEmailOverride: dto.candidateEmailOverride || undefined,
          },
        );
      } catch (queueErr: any) {
        this.logger.error(
          `Failed to enqueue calendar invite job: ${queueErr.message}`,
          queueErr.stack,
        );
      }

      return interview;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async createGoogleMeetInvite(interviewId: string, actorUserId: string) {
    return this.googleCalendarService.createGoogleMeetInterviewInvite(
      interviewId,
      actorUserId,
    );
  }
}
