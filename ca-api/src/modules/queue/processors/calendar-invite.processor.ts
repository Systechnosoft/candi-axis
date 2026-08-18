import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject } from '@nestjs/common';
import { QUEUE_NAMES } from '../queue.constants';
import { Pool } from 'pg';
import { PG_POOL } from '../../../infrastructure/database/database.module';
import { EmailService } from '../../email/email.service';
import { AuditService } from '../../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../../storage/storage.service';
import { SendCalendarInviteJobPayload } from '../queue.types';

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeIcsText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function foldIcsLine(line: string): string {
  if (line.length <= 75) {
    return line;
  }
  let folded = line.substring(0, 75);
  let remaining = line.substring(75);
  while (remaining.length > 0) {
    folded += '\r\n ' + remaining.substring(0, 74);
    remaining = remaining.substring(74);
  }
  return folded;
}

function formatRoundType(roundType: string): string {
  switch (roundType) {
    case 'tech1':
      return 'Technical Round 1';
    case 'tech2':
      return 'Technical Round 2';
    case 'screening':
      return 'Screening';
    case 'manager':
      return 'Manager Round';
    case 'hr':
      return 'HR Round';
    default:
      return roundType
        ? roundType.charAt(0).toUpperCase() + roundType.slice(1)
        : 'Interview';
  }
}

/** Build the Note HTML block — returns empty string if note is blank */
function buildNoteSection(note: string | undefined): string {
  const trimmed = (note || '').trim();
  if (!trimmed) return '';
  return `
    <div style="margin: 24px 0; padding: 16px 20px; background-color: #f8f9ff; border-left: 4px solid #4f46e5; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #3730a3; font-family: Arial, sans-serif;">Note from HR</p>
      <div style="font-size: 14px; color: #374151; font-family: Arial, sans-serif; line-height: 1.6;">${trimmed}</div>
    </div>
  `;
}

/** Build the Google Meet section — returns empty string if not online or no link */
function buildMeetSection(mode: string, meetingLink: string | null): string {
  if (mode !== 'online' || !meetingLink) return '';
  return `
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <div style="font-family: Arial, sans-serif; color: #3c4043;">
      <h2 style="font-size: 16px; font-weight: 600; color: #3c4043; margin: 0 0 10px 0;">Google Meet joining info</h2>
      <p style="font-size: 14px; margin: 0 0 14px 0; color: #5f6368;">Join the video call using the link below:</p>
      <div style="margin: 16px 0;">
        <a href="${meetingLink}" target="_blank"
           style="background-color: #1a73e8; color: white; padding: 12px 28px; text-decoration: none;
                  font-size: 15px; font-weight: 600; border-radius: 4px; display: inline-block;">
          Join Google Meet
        </a>
      </div>
      <p style="font-size: 13px; color: #6b7280; margin: 8px 0 0 0;">
        Or copy link: <a href="${meetingLink}" style="color: #1a73e8;">${meetingLink}</a>
      </p>
    </div>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  `;
}

/** Shared detail block for interview metadata */
function buildDetailsBlock(
  roundType: string,
  durationMins: number,
  mode: string,
  location: string | null,
): string {
  const modeLabel = mode === 'online' ? 'Online' : 'Offline';
  const locationLine =
    mode === 'offline' && location
      ? `<li style="margin: 6px 0;"><strong>Location:</strong> ${location}</li>`
      : '';
  return `
    <ul style="padding-left: 20px; margin: 16px 0; font-size: 14px; color: #374151; font-family: Arial, sans-serif; line-height: 1.8;">
      <li style="margin: 6px 0;"><strong>Round Type:</strong> ${formatRoundType(roundType)}</li>
      <li style="margin: 6px 0;"><strong>Duration:</strong> ${durationMins} minutes</li>
      <li style="margin: 6px 0;"><strong>Mode:</strong> ${modeLabel}</li>
      ${locationLine}
    </ul>
  `;
}

/** Shared email wrapper with header/footer */
function wrapEmailHtml(bodyContent: string, orgName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif;">
      <div style="max-width: 620px; margin: 32px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 28px 32px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
            ${orgName}
          </h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.8);">Talent Acquisition</p>
        </div>
        <!-- Body -->
        <div style="padding: 32px;">
          ${bodyContent}
        </div>
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            This email was sent by ${orgName} Recruitment Team. Please do not reply directly to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/** Build the Candidate email HTML */
function buildCandidateEmailHtml(params: {
  candidateName: string;
  jobTitle: string;
  roundType: string;
  durationMins: number;
  mode: string;
  location: string | null;
  meetingLink: string | null;
  note: string | undefined;
  orgName: string;
}): string {
  const {
    candidateName,
    jobTitle,
    roundType,
    durationMins,
    mode,
    location,
    meetingLink,
    note,
    orgName,
  } = params;
  const details = buildDetailsBlock(roundType, durationMins, mode, location);
  const noteSection = buildNoteSection(note);
  const meetSection = buildMeetSection(mode, meetingLink);

  const bodyContent = `
    <p style="font-size: 15px; color: #111827; margin: 0 0 16px 0;">Hello <strong>${candidateName}</strong>,</p>
    <p style="font-size: 14px; color: #374151; margin: 0 0 16px 0;">Hope you are doing well.</p>
    <p style="font-size: 14px; color: #374151; margin: 0 0 8px 0;">
      Your interview has been scheduled for the role of <strong>${jobTitle}</strong>.
    </p>
    <p style="font-size: 14px; color: #374151; margin: 0 0 4px 0;">Please find the interview details below:</p>
    ${details}
    ${noteSection}
    ${meetSection}
    <p style="font-size: 14px; color: #374151; margin: 16px 0 0 0;">Please join on time.</p>
    <br/>
    <p style="font-size: 14px; color: #374151; margin: 0;">Regards,<br/><strong>${orgName}</strong></p>
  `;

  return wrapEmailHtml(bodyContent, orgName);
}

/** Build the Interviewer email HTML */
function buildInterviewerEmailHtml(params: {
  interviewerName: string;
  candidateName: string;
  jobTitle: string;
  roundType: string;
  durationMins: number;
  mode: string;
  location: string | null;
  meetingLink: string | null;
  note: string | undefined;
  orgName: string;
}): string {
  const {
    interviewerName,
    candidateName,
    jobTitle,
    roundType,
    durationMins,
    mode,
    location,
    meetingLink,
    note,
    orgName,
  } = params;
  const details = buildDetailsBlock(roundType, durationMins, mode, location);
  const noteSection = buildNoteSection(note);
  const meetSection = buildMeetSection(mode, meetingLink);

  const bodyContent = `
    <p style="font-size: 15px; color: #111827; margin: 0 0 16px 0;">Hello <strong>${interviewerName}</strong>,</p>
    <p style="font-size: 14px; color: #374151; margin: 0 0 16px 0;">Hope you are doing well.</p>
    <p style="font-size: 14px; color: #374151; margin: 0 0 8px 0;">
      You have been assigned to interview <strong>${candidateName}</strong> for the role of <strong>${jobTitle}</strong>.
    </p>
    <p style="font-size: 14px; color: #374151; margin: 0 0 4px 0;">Please find the interview details below:</p>
    ${details}
    ${noteSection}
    ${meetSection}
    <p style="font-size: 14px; color: #374151; margin: 16px 0 0 0;">Please join on time.</p>
    <br/>
    <p style="font-size: 14px; color: #374151; margin: 0;">Regards,<br/><strong>${orgName}</strong></p>
  `;

  return wrapEmailHtml(bodyContent, orgName);
}

interface InterviewData {
  id: string;
  application_id: string;
  round_no: number;
  round_type: string;
  scheduled_start_utc: string | Date;
  duration_mins: number;
  mode: string;
  location: string;
  meeting_link: string;
  status: string;
}

interface ApplicationData {
  candidate_id: string;
  job_posting_id: string;
  candidate_name: string;
  candidate_email: string;
  job_title: string;
  jd_id: string;
}

interface InterviewerData {
  id: string;
  full_name: string;
  email: string;
}

interface OrganizerData {
  full_name: string;
  email: string;
  org_id: string;
}

interface CCUserData {
  email: string;
}

interface OrgData {
  name: string;
}

interface ResumeDocData {
  storage_bucket: string;
  storage_key: string;
  original_file_name: string;
  mime_type: string;
}

@Processor(QUEUE_NAMES.CALENDAR_INVITES)
export class CalendarInviteProcessor extends WorkerHost {
  private readonly logger = new Logger(CalendarInviteProcessor.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<SendCalendarInviteJobPayload>) {
    this.logger.debug(
      `Starting processing calendar invite for job [${job.id}] in queue [${QUEUE_NAMES.CALENDAR_INVITES}]`,
    );

    if (job.name === 'send-calendar-invite') {
      await this.handleSendCalendarInvite(job);
    } else {
      this.logger.warn(
        `Unknown job name: ${job.name} in queue ${QUEUE_NAMES.CALENDAR_INVITES}`,
      );
    }
  }

  private async handleSendCalendarInvite(
    job: Job<SendCalendarInviteJobPayload>,
  ) {
    const {
      interviewId,
      emailSubject,
      note,
      actorUserId,
      ccUserIds = [],
    } = job.data;
    const client = await this.pool.connect();

    try {
      // 1. Fetch interview details (re-query to pick up any updated meeting_link from Google Meet)
      const interviewRes = await client.query<InterviewData>(
        `SELECT id, application_id, round_no, round_type, scheduled_start_utc, duration_mins, mode, location, meeting_link, status 
         FROM ca_interviews WHERE id = $1 AND is_deleted = false`,
        [interviewId],
      );
      if (interviewRes.rows.length === 0) {
        throw new Error(`Interview not found or deleted: ${interviewId}`);
      }
      const interview = interviewRes.rows[0];

      // 2. Fetch application and candidate details
      const appRes = await client.query<ApplicationData>(
        `SELECT cjs.candidate_id, cjs.job_posting_id, c.full_name as candidate_name, c.email as candidate_email,
                jp.name as job_title, jp.jd_id
         FROM ca_candidate_job_stages cjs
         JOIN ca_candidates c ON cjs.candidate_id = c.id
         JOIN ca_job_postings jp ON cjs.job_posting_id = jp.id
         WHERE cjs.id = $1`,
        [interview.application_id],
      );
      if (appRes.rows.length === 0) {
        throw new Error(`Application not found for interview: ${interviewId}`);
      }
      const appData = appRes.rows[0];

      // 3. Fetch interviewers
      const interviewersRes = await client.query<InterviewerData>(
        `SELECT u.id, u.full_name, u.email 
         FROM ca_users u
         JOIN ca_interview_assignments ia ON u.id = ia.interviewer_user_id
         WHERE ia.interview_id = $1 AND u.is_active = true AND u.is_deleted = false`,
        [interviewId],
      );
      const interviewers = interviewersRes.rows;

      // 4. Fetch recruiter/organizer (actor)
      const actorRes = await client.query<OrganizerData>(
        `SELECT full_name, email, org_id FROM ca_users WHERE id = $1 AND is_active = true AND is_deleted = false`,
        [actorUserId],
      );
      if (actorRes.rows.length === 0) {
        throw new Error(`Actor user not found: ${actorUserId}`);
      }
      const organizer = actorRes.rows[0];

      // 5. Fetch organisation name for email sign-off
      let orgName = 'Recruitment Team';
      try {
        const orgRes = await client.query<OrgData>(
          `SELECT name FROM ca_organisations WHERE id = $1`,
          [organizer.org_id],
        );
        if (orgRes.rows.length > 0 && orgRes.rows[0].name) {
          orgName = orgRes.rows[0].name;
        }
      } catch {
        this.logger.warn('Could not fetch org name; using default.');
      }

      // 6. Fetch CC emails
      let ccEmails: string[] = [];
      if (ccUserIds.length > 0) {
        const ccRes = await client.query<CCUserData>(
          `SELECT email FROM ca_users WHERE id = ANY($1) AND is_active = true AND is_deleted = false`,
          [ccUserIds],
        );
        ccEmails = ccRes.rows
          .map((r: { email: string }) => r.email)
          .filter(Boolean);
      }

      // 7. Fetch candidate resume from MinIO (for interviewer email attachment)
      let resumeAttachment: {
        filename: string;
        content: Buffer;
        contentType: string;
      } | null = null;
      try {
        const resumeDoc = await client.query<ResumeDocData>(
          `SELECT storage_bucket, storage_key, original_file_name, mime_type
           FROM ca_documents
           WHERE entity_type = 'candidate' AND entity_id = $1 AND is_primary = true AND is_deleted = false
           ORDER BY created_at DESC LIMIT 1`,
          [appData.candidate_id],
        );
        if (resumeDoc.rows.length > 0) {
          const doc = resumeDoc.rows[0];
          const fileBuffer = await this.storageService.downloadObject(
            doc.storage_bucket,
            doc.storage_key,
          );
          resumeAttachment = {
            filename: doc.original_file_name || 'Candidate Resume.pdf',
            content: fileBuffer,
            contentType: doc.mime_type || 'application/pdf',
          };
          this.logger.log(
            `Resume fetched for candidate ${appData.candidate_id}: ${doc.original_file_name}`,
          );
        } else {
          this.logger.warn(
            `No primary resume found for candidate ${appData.candidate_id}. Interviewer email will be sent without attachment.`,
          );
        }
      } catch (resumeErr: unknown) {
        const errMsg =
          resumeErr instanceof Error ? resumeErr.message : String(resumeErr);
        this.logger.warn(
          `Failed to fetch resume for candidate ${appData.candidate_id}: ${errMsg}. Continuing without attachment.`,
        );
      }

      // 8. Build email templates
      const candidateEmailHtml = buildCandidateEmailHtml({
        candidateName: appData.candidate_name,
        jobTitle: appData.job_title,
        roundType: interview.round_type,
        durationMins: interview.duration_mins || 60,
        mode: interview.mode,
        location: interview.location || null,
        meetingLink: interview.meeting_link || null,
        note,
        orgName,
      });

      // 9. Build ICS content for calendar invite
      const inviteUid = interviewId;
      const startDate = new Date(interview.scheduled_start_utc);
      const durationMins = interview.duration_mins || 60;
      const endDate = new Date(startDate.getTime() + durationMins * 60 * 1000);

      const gmailUser = this.configService.get<string>('GMAIL_USER') || '';
      const organizerEmail = gmailUser ? gmailUser.trim() : organizer.email;
      const organizerCN = organizer.full_name || 'Recruitment Team';

      const locationText =
        interview.mode === 'online'
          ? interview.meeting_link || 'Google Meet'
          : interview.location || 'Office';

      const icsDescriptionText =
        stripHtml(candidateEmailHtml) +
        (interview.meeting_link
          ? `\n\nJoin Google Meet: ${interview.meeting_link}`
          : '');

      const icsLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//ATS//Interview Scheduler//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${inviteUid}`,
        `DTSTAMP:${formatIcsDate(new Date())}`,
        `DTSTART:${formatIcsDate(startDate)}`,
        `DTEND:${formatIcsDate(endDate)}`,
        `SUMMARY:${escapeIcsText(emailSubject)}`,
        `DESCRIPTION:${escapeIcsText(icsDescriptionText)}`,
        `X-ALT-DESC;FMTTYPE=text/html:${escapeIcsText(candidateEmailHtml)}`,
        `LOCATION:${escapeIcsText(locationText)}`,
        `ORGANIZER;CN="${escapeIcsText(organizerCN)}":mailto:${organizerEmail}`,
      ];

      if (interview.mode === 'online' && interview.meeting_link) {
        icsLines.push(
          `URL;CHARSET=UTF-8:${escapeIcsText(interview.meeting_link)}`,
          'X-MICROSOFT-ONLINEMEETING:TRUE',
          `X-MICROSOFT-CONFERENCELINK:${escapeIcsText(interview.meeting_link)}`,
        );
      }

      // Add interviewers as ICS attendees
      for (const int of interviewers) {
        if (int.email) {
          icsLines.push(
            `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN="${escapeIcsText(int.full_name)}":mailto:${int.email}`,
          );
        }
      }

      icsLines.push(
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'TRANSP:OPAQUE',
        'END:VEVENT',
        'END:VCALENDAR',
      );

      const icsContent = icsLines.map(foldIcsLine).join('\r\n');

      const finalCandidateEmail = job.data.candidateEmailOverride || appData.candidate_email;

      // 10a. Send Candidate email — with ICS calendar invite, NO resume attachment
      if (finalCandidateEmail) {
        try {
          await this.emailService.sendEmail({
            to: [finalCandidateEmail],
            subject: emailSubject,
            html: candidateEmailHtml,
            replyTo: organizer.email || undefined,
            icalEvent: {
              filename: 'invite.ics',
              method: 'REQUEST',
              content: icsContent,
            },
          });
          this.logger.log(
            `Candidate email sent to: ${finalCandidateEmail}`,
          );
        } catch (candidateEmailErr: unknown) {
          const errMsg =
            candidateEmailErr instanceof Error
              ? candidateEmailErr.message
              : String(candidateEmailErr);
          const errStack =
            candidateEmailErr instanceof Error
              ? candidateEmailErr.stack
              : undefined;
          this.logger.error(
            `Failed to send candidate email: ${errMsg}`,
            errStack,
          );
        }
      } else {
        this.logger.warn(
          `No candidate email address found for application ${interview.application_id}. Skipping candidate email.`,
        );
      }

      // 10b. Send Interviewer email(s) — each interviewer gets a personalized email with resume attachment
      for (const interviewer of interviewers) {
        if (!interviewer.email) continue;

        const interviewerEmailHtml = buildInterviewerEmailHtml({
          interviewerName: interviewer.full_name || 'Interviewer',
          candidateName: appData.candidate_name,
          jobTitle: appData.job_title,
          roundType: interview.round_type,
          durationMins: interview.duration_mins || 60,
          mode: interview.mode,
          location: interview.location || null,
          meetingLink: interview.meeting_link || null,
          note,
          orgName,
        });

        const interviewerAttachments = resumeAttachment
          ? [resumeAttachment]
          : [];

        try {
          await this.emailService.sendEmail({
            to: [interviewer.email],
            subject: emailSubject,
            html: interviewerEmailHtml,
            replyTo: organizer.email || undefined,
            icalEvent: {
              filename: 'invite.ics',
              method: 'REQUEST',
              content: icsContent,
            },
            attachments: interviewerAttachments,
          });
          this.logger.log(
            `Interviewer email sent to: ${interviewer.email}${resumeAttachment ? ' (with resume)' : ' (no resume attached)'}`,
          );
        } catch (intEmailErr: unknown) {
          const errMsg =
            intEmailErr instanceof Error
              ? intEmailErr.message
              : String(intEmailErr);
          const errStack =
            intEmailErr instanceof Error ? intEmailErr.stack : undefined;
          this.logger.error(
            `Failed to send interviewer email to ${interviewer.email}: ${errMsg}`,
            errStack,
          );
        }
      }

      // 10c. Send CC copy notification — uses candidate template body
      if (ccEmails.length > 0) {
        await this.emailService.sendEmail({
          to: ccEmails,
          subject: `[Copy] ${emailSubject}`,
          html: `
            <p style="font-family: Arial, sans-serif; font-size: 14px; color: #555; background-color: #f3f4f6; padding: 10px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
              <strong>Note:</strong> You have been copied on this interview schedule notification. It has NOT been added to your calendar.
            </p>
            ${candidateEmailHtml}
          `,
          replyTo: organizer.email || undefined,
        });
      }

      // 11. Update sub_stage to interview_scheduled
      await client.query(
        `UPDATE public.ca_candidate_job_stages 
         SET sub_stage = 'interview_scheduled', updated_at = now()
         WHERE id = $1`,
        [interview.application_id],
      );

      // Update interview outlook status
      await client.query(
        `UPDATE ca_interviews 
         SET outlook_event_id = $1, outlook_status = 'created', updated_at = now() 
         WHERE id = $2`,
        [inviteUid, interviewId],
      );

      // 12. Audit Log
      await this.auditService.log({
        entityType: 'interview',
        entityId: interviewId,
        action: 'interview_scheduled',
        changedBy: actorUserId,
        beforeJson: null,
        afterJson: {
          outlook_status: 'created',
          outlook_event_id: inviteUid,
          scheduled_start_utc: interview.scheduled_start_utc,
          round_type: interview.round_type,
          mode: interview.mode,
          location: interview.location,
          meeting_link: interview.meeting_link,
          resume_attached: !!resumeAttachment,
        },
        reasonContext:
          'Interview scheduled. Candidate email (no attachment) and Interviewer email(s) (with resume) sent.',
      });

      this.logger.log(
        `Successfully processed calendar invite for interview: ${interviewId}`,
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errStack = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `Failed processing calendar invite for interview ${interviewId}: ${errMsg}`,
        errStack,
      );

      try {
        await client.query(
          `UPDATE ca_interviews SET outlook_status = 'failed', updated_at = now() WHERE id = $1`,
          [interviewId],
        );

        await this.auditService.log({
          entityType: 'interview',
          entityId: interviewId,
          action: 'interview_schedule_failed',
          changedBy: actorUserId,
          beforeJson: null,
          afterJson: {
            outlook_status: 'failed',
            error: errMsg,
          },
          reasonContext:
            'Failed to process and send interview calendar invite via dedicated calendar-invites BullMQ job.',
        });
      } catch (dbErr: unknown) {
        const dbErrMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
        const dbErrStack = dbErr instanceof Error ? dbErr.stack : undefined;
        this.logger.error(
          `Failed to record scheduling failure in DB: ${dbErrMsg}`,
          dbErrStack,
        );
      }

      throw err;
    } finally {
      client.release();
    }
  }
}
