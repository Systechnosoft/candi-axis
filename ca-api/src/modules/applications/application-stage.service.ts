import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';
import { AuditService } from '../audit/audit.service';
import { ApplicationStage } from './dto/update-stage.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class ApplicationStageService {
  private readonly logger = new Logger(ApplicationStageService.name);

  constructor(
    @Inject(PG_POOL) private pool: Pool,
    private auditService: AuditService,
    private emailService: EmailService,
  ) {}

  async updateStage(
    applicationId: string,
    userId: string,
    toStage: ApplicationStage,
    reason?: string,
    notes?: string,
    offeredAmount?: number,
    joiningDate?: string,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Fetch current stage and org_id
      const currentRes = await client.query(
        'SELECT stage, candidate_id, job_posting_id, org_id FROM public.ca_candidate_job_stages WHERE id = $1 AND deleted_at IS NULL',
        [applicationId],
      );
      if (currentRes.rows.length === 0) {
        throw new NotFoundException('Application stage record not found');
      }
      const application = currentRes.rows[0];
      const fromStage = application.stage as ApplicationStage;

      const toSubStage =
        toStage === 'interviewing' ? 'interview_to_be_scheduled' : null;
      // Update ca_candidate_job_stages
      const updateQuery = `
        UPDATE public.ca_candidate_job_stages
        SET stage = $1, 
            stage_reason = $2, 
            sub_stage = $3,
            updated_at = now()
        WHERE id = $4
        RETURNING *
      `;
      const updateRes = await client.query(updateQuery, [
        toStage,
        reason || null,
        toSubStage,
        applicationId,
      ]);
      const updatedApp = updateRes.rows[0];

      // Audit log
      await this.auditService.log({
        entityType: 'applications',
        entityId: applicationId,
        action: 'UPDATE_STAGE',
        changedBy: userId,
        beforeJson: application,
        afterJson: updatedApp,
        reasonContext: reason || notes || `Stage updated to ${toStage}`,
      });

      let newTaskId: number | null = null;
      let assigneeEmails: Array<{ email: string; full_name: string }> = [];
      let candidateName = 'Candidate';
      let jobTitle = 'Job Description';
      let jpName = 'Job Posting';

      // If moving to screening, create a screening review task for the interviewers
      if (toStage === 'screening') {
        const jpRes = await client.query(
          'SELECT id, jd_id, name, interviewer_ids FROM public.ca_job_postings WHERE id = $1',
          [application.job_posting_id],
        );
        const jp = jpRes.rows[0];

        if (jp) {
          jpName = jp.name;
          const candRes = await client.query(
            'SELECT full_name FROM public.ca_candidates WHERE id = $1',
            [application.candidate_id],
          );
          candidateName = candRes.rows[0]?.full_name || 'Candidate';

          const jdRes = await client.query(
            'SELECT title FROM public.ca_job_descriptions WHERE id = $1',
            [jp.jd_id],
          );
          jobTitle = jdRes.rows[0]?.title || 'Job Description';

          let assigneeIds: string[] = jp.interviewer_ids || [];
          if (assigneeIds.length === 0) {
            // Get all active interviewers in this organization
            const interviewerRes = await client.query(
              `SELECT DISTINCT u.id
               FROM ca_users u
               JOIN ca_user_roles ur ON u.id = ur.user_id
               JOIN ca_roles r ON r.id = ur.role_id
               WHERE u.is_active = true 
                 AND u.is_deleted = false
                 AND u.status = 'active'
                 AND r.code = 'interviewer'
                 AND u.org_id = $1`,
              [application.org_id],
            );
            assigneeIds = interviewerRes.rows.map((r) => r.id);
          }

          if (assigneeIds.length > 0) {
            // Insert task
            const taskCode = `TSK-${Math.floor(100000 + Math.random() * 900000)}`;
            const taskInsertRes = await client.query(
              `INSERT INTO public.ca_tasks (
                org_id, name, assignee, jd_id, candidate_id, application_id, jobposting_id, status, is_active, task_code
              ) VALUES ($1, $2, $3::uuid[], $4, $5, $6, $7, 'new', true, $8)
               RETURNING task_id`,
              [
                application.org_id,
                'Screening Review',
                assigneeIds,
                jp.jd_id,
                application.candidate_id,
                applicationId,
                application.job_posting_id,
                taskCode,
              ],
            );
            newTaskId = taskInsertRes.rows[0]?.task_id;

            // Fetch assignee details for notification emails
            const usersRes = await client.query(
              `SELECT email, full_name FROM public.ca_users WHERE id = ANY($1::uuid[])`,
              [assigneeIds],
            );
            assigneeEmails = usersRes.rows;
          }
        }
      }

      await client.query('COMMIT');

      // Trigger emails outside transaction block to prevent SMTP issues from rolling back stage transitions
      if (toStage === 'screening' && newTaskId && assigneeEmails.length > 0) {
        const uiOrigin = process.env.UI_ORIGIN || 'http://localhost:3001';
        const reviewUrl = `${uiOrigin}/tasks/${newTaskId}/review`;

        for (const interviewer of assigneeEmails) {
          const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #2563eb;">Screening Review Request</h2>
              <p>Hello <strong>${interviewer.full_name}</strong>,</p>
              <p>A new candidate has been moved to the <strong>Screening</strong> stage and is waiting for your review.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 120px;">Candidate:</td>
                  <td style="padding: 8px 0;">${candidateName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Job Posting:</td>
                  <td style="padding: 8px 0;">${jpName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Job Title:</td>
                  <td style="padding: 8px 0;">${jobTitle}</td>
                </tr>
              </table>
              <p>Please review their profile and submit your feedback (approve/reject) by clicking the button below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${reviewUrl}" style="background-color: #2563eb; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">Review Candidate Profile</a>
              </div>
              <p style="font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px;">This task is assigned to multiple interviewers. Once any interviewer submits feedback, the task will be marked complete and disappear from other lists.</p>
            </div>
          `;

          this.emailService
            .sendEmail({
              to: interviewer.email,
              subject: `Action Required: Screening Review for ${candidateName}`,
              html: emailHtml,
            })
            .catch((err) => {
              this.logger.error(
                `Failed to send screening email to ${interviewer.email}: ${err.message}`,
              );
            });
        }
      }

      return {
        id: updatedApp.id,
        candidate_id: updatedApp.candidate_id,
        stage: updatedApp.stage,
        sub_stage: updatedApp.sub_stage,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      this.logger.error(
        `Failed to update application stage: ${err.message}`,
        err.stack,
      );
      throw err;
    } finally {
      client.release();
    }
  }
}
