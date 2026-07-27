import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';
import { ApplicationStageService } from '../applications/application-stage.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TasksService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly stageService: ApplicationStageService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(userId: string) {
    // Check if user is admin or super_admin
    const userRoleRes = await this.pool.query(
      `SELECT r.code 
       FROM ca_user_roles ur
       JOIN ca_roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [userId],
    );
    const roles = userRoleRes.rows.map((r) => r.code);
    const isAdmin = roles.includes('admin') || roles.includes('super_admin');

    let query = `
      SELECT t.*, c.full_name as candidate_name, jd.title as job_title, jd.code as jd_code,
             CONCAT(t.name, '-', c.full_name, '(#', t.task_id, ')') as name,
              (
                SELECT string_agg(DISTINCT r.name, ', ')
                FROM ca_users u
                JOIN ca_user_roles ur ON u.id = ur.user_id
                JOIN ca_roles r ON r.id = ur.role_id
                WHERE u.id = ANY(t.assignee)
              ) as assignee_role_names
       FROM ca_tasks t
       JOIN ca_candidates c ON t.candidate_id = c.id
       JOIN ca_job_descriptions jd ON t.jd_id = jd.id
       LEFT JOIN ca_job_postings jp ON t.jobposting_id = jp.id
    `;

    let queryParams: any[] = [];

    if (!isAdmin) {
      queryParams = [userId];
      const conditions: string[] = [];

      // Check if they are assignee (applicable to any non-admin)
      conditions.push(`$1 = ANY(t.assignee)`);

      // Hiring manager can see tasks under JDs they own
      if (roles.includes('hiring_manager')) {
        conditions.push(`jd.owner_user_id = $1`);
      }

      // HR can see tasks under job postings they manage
      if (roles.includes('hr_recruiter')) {
        conditions.push(`$1 = ANY(jp.hr_ids)`);
      }

      query += ` WHERE t.is_active = true AND (${conditions.join(' OR ')})`;
    } else {
      query += ` WHERE t.is_active = true`;
    }

    query += ` ORDER BY t.assigned_on DESC`;

    const res = await this.pool.query(query, queryParams);
    return res.rows;
  }

  async findOne(taskId: string, userId: string) {
    const id = parseInt(taskId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid task ID format');
    }

    // Check if user is admin or super_admin
    const userRoleRes = await this.pool.query(
      `SELECT r.code 
       FROM ca_user_roles ur
       JOIN ca_roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [userId],
    );
    const roles = userRoleRes.rows.map((r) => r.code);
    const isAdmin = roles.includes('admin') || roles.includes('super_admin');

    // 1. Fetch task details joined with job_descriptions, candidates and job_postings to evaluate ownership
    const taskRes = await this.pool.query(
      `SELECT t.*, jd.owner_user_id, jp.hr_ids, u.full_name as submitted_by_name, c.full_name as candidate_name
       FROM ca_tasks t
       JOIN ca_job_descriptions jd ON t.jd_id = jd.id
       JOIN ca_candidates c ON t.candidate_id = c.id
       LEFT JOIN ca_job_postings jp ON t.jobposting_id = jp.id
       LEFT JOIN ca_users u ON t.submitted_by = u.id
       WHERE t.task_id = $1`,
      [id],
    );
    if (taskRes.rows.length === 0) {
      throw new NotFoundException('Task not found');
    }
    const task = taskRes.rows[0];

    // Authorize user access
    let hasAccess = false;
    if (isAdmin) {
      hasAccess = true;
    } else {
      const isAssignee = task.assignee.includes(userId);
      const isOwner = task.owner_user_id === userId;
      const isHr = task.hr_ids && task.hr_ids.includes(userId);

      const hasHrAccess =
        roles.includes('hr_recruiter') && (isAssignee || isHr);
      const hasHMAccess =
        roles.includes('hiring_manager') && (isAssignee || isOwner);
      const hasInterviewerAccess = roles.includes('interviewer') && isAssignee;

      hasAccess = hasHrAccess || hasHMAccess || hasInterviewerAccess;
    }

    if (!hasAccess) {
      throw new NotFoundException('Task not found');
    }

    const formattedName = task.candidate_name
      ? `${task.name}-${task.candidate_name}(#${task.task_id})`
      : task.name;
    const taskMetadata = {
      ...task,
      name: formattedName,
    };

    // If task is new or read, update status to open
    if (task.status === 'new' || task.status === 'read') {
      await this.pool.query(
        `UPDATE ca_tasks SET status = 'open', updated_at = now() WHERE task_id = $1`,
        [id],
      );
      taskMetadata.status = 'open';
    }

    const isCompleted = task.submitted_on !== null || !task.is_active;
    const isOnlyInterviewer =
      roles.includes('interviewer') &&
      !roles.includes('hr_recruiter') &&
      !roles.includes('hiring_manager') &&
      !roles.includes('admin') &&
      !roles.includes('super_admin');

    if (isCompleted && isOnlyInterviewer) {
      return {
        task: taskMetadata,
        candidate: null,
        jobDescription: null,
        fitScore: null,
        resumeDoc: null,
      };
    }

    const candidateId = task.candidate_id;
    const jdId = task.jd_id;
    const appId = task.application_id;

    // Fetch all details concurrently using Promise.all to avoid a sequential query waterfall
    const [
      candRes,
      eduRes,
      empRes,
      certRes,
      socRes,
      projRes,
      tagsRes,
      jdRes,
      matchRes,
      docRes,
      jdTagsRes,
    ] = await Promise.all([
      this.pool.query(
        `SELECT * FROM ca_candidates WHERE id = $1 AND is_deleted = false`,
        [candidateId],
      ),
      this.pool.query(
        `SELECT * FROM ca_candidate_educations WHERE candidate_id = $1 AND is_deleted = false ORDER BY sort_order ASC, start_year DESC`,
        [candidateId],
      ),
      this.pool.query(
        `SELECT * FROM ca_candidate_employments WHERE candidate_id = $1 AND is_deleted = false ORDER BY sort_order ASC, start_date DESC`,
        [candidateId],
      ),
      this.pool.query(
        `SELECT * FROM ca_candidate_certifications WHERE candidate_id = $1 AND is_deleted = false ORDER BY sort_order ASC`,
        [candidateId],
      ),
      this.pool.query(
        `SELECT * FROM ca_candidate_social_links WHERE candidate_id = $1 AND is_deleted = false ORDER BY sort_order ASC`,
        [candidateId],
      ),
      this.pool.query(
        `SELECT * FROM ca_candidate_projects WHERE candidate_id = $1 AND is_deleted = false ORDER BY sort_order ASC`,
        [candidateId],
      ),
      this.pool.query(
        `SELECT t.id, t.name, t.type
         FROM ca_entity_tags et
         JOIN ca_tags t ON et.tag_id = t.id
         WHERE et.entity_type = 'candidate' 
           AND et.entity_id = $1 
           AND t.is_deleted = false 
           AND t.active = true`,
        [candidateId],
      ),
      this.pool.query(`SELECT * FROM ca_job_descriptions WHERE id = $1`, [
        jdId,
      ]),
      this.pool.query(
        `SELECT rating FROM ca_job_candidate_matches WHERE job_id = $1 AND candidate_id = $2 AND deleted_at IS NULL LIMIT 1`,
        [jdId, candidateId],
      ),
      this.pool.query(
        `SELECT id, original_file_name, mime_type, storage_bucket, storage_key 
         FROM ca_documents 
         WHERE entity_type = 'candidate' AND entity_id = $1 AND is_primary = true AND is_deleted = false LIMIT 1`,
        [candidateId],
      ),
      this.pool.query(
        `SELECT t.id, t.name, t.type
         FROM ca_entity_tags et
         JOIN ca_tags t ON et.tag_id = t.id
         WHERE et.entity_type = 'job_description' 
           AND et.entity_id = $1 
           AND t.is_deleted = false 
           AND t.active = true`,
        [jdId],
      ),
    ]);

    const candidate = candRes.rows[0] || null;
    const educations = eduRes.rows;
    const employments = empRes.rows;
    const certifications = certRes.rows;
    const socialLinks = socRes.rows;
    const projects = projRes.rows;
    const tags = tagsRes.rows;
    const jobDescription = jdRes.rows[0] || null;
    const fitScore = matchRes.rows.length > 0 ? matchRes.rows[0].rating : null;
    const resumeDoc = docRes.rows[0] || null;
    const jdTags = jdTagsRes.rows;

    return {
      task: taskMetadata,
      candidate: candidate
        ? {
            ...candidate,
            educations,
            employments,
            certifications,
            social_links: socialLinks,
            projects,
            tags,
          }
        : null,
      jobDescription: jobDescription
        ? {
            ...jobDescription,
            tags: jdTags,
          }
        : null,
      fitScore,
      resumeDoc,
    };
  }

  async markAsRead(taskId: string) {
    const id = parseInt(taskId, 10);
    if (isNaN(id)) return;

    await this.pool.query(
      `UPDATE ca_tasks 
       SET status = 'read', updated_at = now() 
       WHERE task_id = $1 AND status = 'new'`,
      [id],
    );
  }

  async submitFeedback(
    taskId: string,
    userId: string,
    action: 'approve' | 'reject',
    reason: string,
  ) {
    const id = parseInt(taskId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid task ID format');
    }

    // 1. Fetch task
    const taskRes = await this.pool.query(
      `SELECT * FROM ca_tasks WHERE task_id = $1`,
      [id],
    );
    if (taskRes.rows.length === 0) {
      throw new NotFoundException('Task not found');
    }
    const task = taskRes.rows[0];

    // Check if task is already submitted or inactive
    if (task.submitted_on !== null || !task.is_active) {
      return {
        success: false,
        message:
          'This screening review has already been completed by another interviewer.',
      };
    }

    // Check if user is an assignee
    if (!task.assignee.includes(userId)) {
      throw new BadRequestException(
        'You are not authorized to submit feedback for this task.',
      );
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 2. Update the task
      await client.query(
        `UPDATE ca_tasks 
         SET submitted_on = now(),
             submitted_by = $1,
             feedback_action = $2,
             feedback_reason = $3,
             is_active = false,
             status = 'completed',
             updated_at = now()
         WHERE task_id = $4`,
        [userId, action, reason || null, id],
      );

      // Create Audit Log for the feedback submission
      await this.auditService.log({
        entityType: 'tasks',
        entityId: String(id),
        action: 'SUBMIT_FEEDBACK',
        changedBy: userId,
        beforeJson: { is_active: true, submitted_on: null },
        afterJson: {
          is_active: false,
          submitted_on: new Date(),
          feedback_action: action,
          feedback_reason: reason,
        },
        reasonContext: `Interviewer submitted screening review feedback: ${action}`,
      });

      await client.query('COMMIT');

      // 3. Trigger stage transition if approved
      if (action === 'approve') {
        // We run updateStage outside the transaction as it contains nested service calls, emails, audit logs, and independent database locks.
        try {
          await this.stageService.updateStage(
            task.application_id,
            userId,
            'interviewing',
            'Screening approved by interviewer',
          );
        } catch (err: any) {
          // If updateStage fails, we log it, but the task feedback submission is already saved.
          this.pool
            .query(
              `UPDATE ca_tasks SET error_message = $1 WHERE task_id = $2`,
              [`Stage update failed: ${err.message}`, id],
            )
            .catch(() => {});
        }
      }

      return {
        success: true,
        message: `Feedback submitted successfully. Task marked as ${action}d.`,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
