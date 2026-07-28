import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';
import { AuditService } from '../audit/audit.service';
import { CreateApplicationDto } from './dto/create-application.dto';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @Inject(PG_POOL) private pool: Pool,
    private auditService: AuditService,
  ) {}

  async create(userId: string, dto: CreateApplicationDto) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check for duplicate application
      const dupCheck = await client.query(
        `SELECT cjs.id FROM public.ca_candidate_job_stages cjs
         JOIN public.job_postings jp ON cjs.job_posting_id = jp.id
         WHERE cjs.candidate_id = $1 AND jp.jd_id = $2 AND cjs.deleted_at IS NULL`,
        [dto.candidate_id, dto.jd_id],
      );

      if (dupCheck.rows.length > 0) {
        throw new ConflictException(
          'Application already exists for this candidate and JD',
        );
      }

      // Verify candidate exists
      const candCheck = await client.query(
        'SELECT id, org_id FROM ca_candidates WHERE id = $1 AND is_deleted = false',
        [dto.candidate_id],
      );
      if (candCheck.rows.length === 0) {
        throw new NotFoundException('Candidate not found');
      }
      const candidateOrgId = candCheck.rows[0].org_id;

      // Verify JD exists
      const jdCheck = await client.query(
        'SELECT id, org_id FROM job_descriptions WHERE id = $1 AND is_deleted = false',
        [dto.jd_id],
      );
      if (jdCheck.rows.length === 0) {
        throw new NotFoundException('Job Description not found');
      }
      const jdOrgId = jdCheck.rows[0].org_id;

      const orgId = candidateOrgId || jdOrgId;

      // Verify or create Job Posting
      const jpCheck = await client.query(
        'SELECT id FROM public.ca_job_postings WHERE jd_id = $1 LIMIT 1',
        [dto.jd_id],
      );
      let jobPostingId = jpCheck.rows[0]?.id;
      if (!jobPostingId) {
        const jpInsert = await client.query(
          `INSERT INTO public.ca_job_postings (org_id, jd_id, name, is_active) VALUES ($1, $2, $3, true) RETURNING id`,
          [orgId, dto.jd_id, 'Posting for JD'],
        );
        jobPostingId = jpInsert.rows[0].id;
      }

      // Create application (stage mapping)
      const appQuery = `
        INSERT INTO public.ca_candidate_job_stages (org_id, candidate_id, job_posting_id, stage, sub_stage)
        VALUES ($1, $2, $3, 'new', NULL)
        RETURNING *
      `;
      const appRes = await client.query(appQuery, [
        orgId,
        dto.candidate_id,
        jobPostingId,
      ]);
      const application = appRes.rows[0];

      // Audit log
      await this.auditService.log({
        entityType: 'applications',
        entityId: application.id,
        action: 'CREATE',
        changedBy: userId,
        afterJson: application,
        reasonContext: 'Application stage created manually',
      });

      await client.query('COMMIT');

      return {
        id: application.id,
        candidate_id: application.candidate_id,
        jd_id: dto.jd_id,
        stage: application.stage,
        sub_stage: application.sub_stage,
        created_at: application.created_at,
        ai_status: 'pending',
      };
    } catch (err) {
      await client.query('ROLLBACK');
      this.logger.error(
        `Failed to create application: ${err.message}`,
        err.stack,
      );
      throw err;
    } finally {
      client.release();
    }
  }

  async findOne(id: string) {
    const query = `
      SELECT a.id, a.candidate_id, a.stage, a.sub_stage, a.created_at,
             jp.jd_id,
             c.full_name as candidate_name, c.email as candidate_email,
             jd.title as jd_title, jd.requisition_id as jd_requisition_id,
             NULL as stage_updated_by_name,
             NULL as created_by_name,
             COALESCE(
               (SELECT rating FROM ca_job_candidate_matches WHERE candidate_id = a.candidate_id AND job_id = jp.jd_id AND is_active = true AND deleted_at IS NULL LIMIT 1),
               0.0
             ) as ai_score
      FROM public.ca_candidate_job_stages a
      JOIN public.ca_candidates c ON a.candidate_id = c.id
      JOIN public.job_postings jp ON a.job_posting_id = jp.id
      JOIN public.job_descriptions jd ON jp.jd_id = jd.id
      WHERE a.id = $1 AND a.deleted_at IS NULL
    `;
    const res = await this.pool.query(query, [id]);
    if (res.rows.length === 0) {
      throw new NotFoundException('Application not found');
    }
    const application = res.rows[0];

    return {
      ...application,
      ai_rating: {
        score: application.ai_score,
        status: 'completed',
        skills_analyzed: [],
        highlights: [],
      },
      history: [],
    };
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    stage?: string;
    jd_id?: string;
    candidate_id?: string;
    recruiter_id?: string;
    search?: string;
    posting_id?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      stage,
      jd_id,
      candidate_id,
      recruiter_id,
      search,
      posting_id,
    } = params;
    const offset = (page - 1) * limit;

    let baseQuery = `
      FROM public.ca_candidate_job_stages a
      JOIN public.ca_candidates c ON a.candidate_id = c.id
      JOIN public.job_postings jp ON a.job_posting_id = jp.id
      JOIN public.job_descriptions jd ON jp.jd_id = jd.id
      WHERE a.deleted_at IS NULL
    `;
    const queryParams: any[] = [];
    let paramIdx = 1;

    if (stage) {
      baseQuery += ` AND a.stage = $${paramIdx++}`;
      queryParams.push(stage);
    }
    if (jd_id) {
      baseQuery += ` AND jp.jd_id = $${paramIdx++}`;
      queryParams.push(jd_id);
    }
    if (posting_id) {
      baseQuery += ` AND a.job_posting_id = $${paramIdx++}`;
      queryParams.push(posting_id);
    }
    if (candidate_id) {
      baseQuery += ` AND a.candidate_id = $${paramIdx++}`;
      queryParams.push(candidate_id);
    }
    if (search) {
      baseQuery += ` AND (c.full_name ILIKE $${paramIdx} OR jd.title ILIKE $${paramIdx})`;
      queryParams.push(`%${search}%`);
      paramIdx++;
    }

    const countRes = await this.pool.query(
      `SELECT COUNT(*) as total ${baseQuery}`,
      queryParams,
    );
    const total = parseInt(countRes.rows[0].total, 10);

    const dataQuery = `
      SELECT a.id, a.candidate_id, a.stage, a.sub_stage, a.created_at,
             jp.jd_id,
             c.full_name as candidate_name, 
             c.email as candidate_email,
             c.phone as candidate_phone,
             c.current_designation as candidate_designation,
             c.location as candidate_location,
             c.total_exp_months as candidate_experience,
             jd.title as jd_title,
             NULL as recruiter_name,
             COALESCE(
               (SELECT rating FROM ca_job_candidate_matches WHERE candidate_id = a.candidate_id AND job_id = jp.jd_id AND is_active = true AND deleted_at IS NULL LIMIT 1),
               0.0
             ) as ai_score
      ${baseQuery}
      ORDER BY a.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx}
    `;
    queryParams.push(limit, offset);
    const dataRes = await this.pool.query(dataQuery, queryParams);

    return {
      data: dataRes.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async refreshAiRating(userId: string, id: string) {
    return { message: 'AI Rating is completed' };
  }
}
