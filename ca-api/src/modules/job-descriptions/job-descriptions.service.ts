import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';
import { CreateJobDescriptionDto } from './dto/create-job-description.dto';
import { UpdateJobDescriptionDto } from './dto/update-job-description.dto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from './prisma.service';
import { MatchingService } from '../matching/matching.service';

@Injectable()
export class JobDescriptionsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    private readonly matchingService: MatchingService,
  ) {}

  private cleanText(text: string): string {
    return text.trim().replace(/ +/g, ' ');
  }

  private cleanHtml(htmlStr: string): string {
    if (!htmlStr) return '';
    const trimmed = htmlStr.trim();
    const stripped = trimmed.replace(/<[^>]+>/g, '').trim();
    if (!stripped || stripped === '&nbsp;') {
      return '';
    }
    return trimmed;
  }

  async create(userId: string, createDto: CreateJobDescriptionDto) {
    if (createDto.exp_min_months != null && createDto.exp_max_months != null) {
      if (createDto.exp_max_months < createDto.exp_min_months) {
        throw new BadRequestException(
          'Maximum experience cannot be less than minimum experience.',
        );
      }
    }

    const cleanedTitle = this.cleanText(createDto.title);
    if (!cleanedTitle) {
      throw new BadRequestException(
        'Job title is required and cannot be conditionally empty.',
      );
    }
    const cleanedCode = createDto.code ? this.cleanText(createDto.code) : null;
    const cleanedLocation = createDto.location
      ? this.cleanText(createDto.location)
      : null;
    const cleanedMustHave = createDto.must_have_text
      ? this.cleanHtml(createDto.must_have_text)
      : null;
    const cleanedNiceToHave = createDto.nice_to_have_text
      ? this.cleanHtml(createDto.nice_to_have_text)
      : null;
    const cleanedSummary = createDto.job_summary
      ? this.cleanHtml(createDto.job_summary)
      : null;
    const cleanedResponsibilities = createDto.responsibilities_text
      ? this.cleanHtml(createDto.responsibilities_text)
      : null;
    const status = createDto.status || 'draft';

    const userRes = await this.pool.query(
      `SELECT org_id FROM public.ca_users WHERE id = $1`,
      [userId],
    );
    let orgId = userRes.rows[0]?.org_id;
    if (!orgId) {
      const defaultOrgRes = await this.pool.query(
        `SELECT id FROM public.ca_organisations ORDER BY created_at ASC LIMIT 1`,
      );
      orgId =
        defaultOrgRes.rows[0]?.id || '7af2ebf4-6888-4757-a585-bcd9115bb0da';
    }

    try {
      const result = await this.pool.query(
        `INSERT INTO ca_job_descriptions (
          org_id, requisition_id, title, code, location, work_mode, employment_type,
          exp_min_months, exp_max_months, must_have_text, nice_to_have_text,
          job_summary, responsibilities_text, status, owner_user_id,
          created_by, updated_by
        ) VALUES ($1, $2, $3, COALESCE($4, 'JD-' || lpad(nextval('job_description_code_seq')::text, 3, '0')), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16) 
         RETURNING *`,
        [
          orgId,
          createDto.requisition_id,
          cleanedTitle,
          cleanedCode,
          cleanedLocation,
          createDto.work_mode || null,
          createDto.employment_type || null,
          createDto.exp_min_months ?? null,
          createDto.exp_max_months ?? null,
          cleanedMustHave,
          cleanedNiceToHave,
          cleanedSummary,
          cleanedResponsibilities,
          status,
          createDto.owner_user_id || null,
          userId,
        ],
      );
      const newJd = result.rows[0];

      await this.auditService.log({
        entityType: 'job_descriptions',
        entityId: newJd.id,
        action: 'CREATE',
        beforeJson: null,
        afterJson: newJd,
        changedBy: userId,
        reasonContext: 'Job Description created via API',
      });

      return newJd;
    } catch (error: any) {
      if (error.code === '23503') {
        throw new BadRequestException(
          'Invalid reference provided for requisition or owner.',
        );
      }
      throw error;
    }
  }

  async findAll(query: {
    requisition_id?: string;
    status?: string;
    search?: string;
  }) {
    const conditions: string[] = ['jd.is_deleted = false'];
    const values: any[] = [];
    let counter = 1;

    if (query.requisition_id) {
      conditions.push(`jd.requisition_id = $${counter++}`);
      values.push(query.requisition_id);
    }
    if (query.status) {
      conditions.push(`jd.status = $${counter++}`);
      values.push(query.status);
    }
    if (query.search) {
      conditions.push(
        `(jd.title ILIKE $${counter} OR jd.code ILIKE $${counter})`,
      );
      values.push(`%${query.search}%`);
      counter++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Join with requisition to provide useful list context
    const result = await this.pool.query(
      `SELECT jd.id, jd.requisition_id, jd.title, jd.code, jd.location, jd.work_mode, jd.employment_type,
              jd.job_summary, jd.responsibilities_text, jd.must_have_text, jd.nice_to_have_text,
              jd.status, jd.owner_user_id, jd.created_at, jd.updated_at,
              req.title as requisition_title, req.code as requisition_code
       FROM ca_job_descriptions jd
       LEFT JOIN ca_job_requisitions req ON jd.requisition_id = req.id
       ${whereClause}
       ORDER BY jd.created_at DESC`,
      values,
    );

    return result.rows;
  }

  async findOne(id: string) {
    // Return discrete JD with req joins
    const result = await this.pool.query(
      `SELECT jd.*, req.title as requisition_title, req.code as requisition_code
       FROM ca_job_descriptions jd
       LEFT JOIN ca_job_requisitions req ON jd.requisition_id = req.id
       WHERE jd.id = $1 AND jd.is_deleted = false`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Job Description with ID ${id} not found.`);
    }

    return result.rows[0];
  }

  async update(id: string, userId: string, updateDto: UpdateJobDescriptionDto) {
    const currentResult = await this.pool.query(
      `SELECT * FROM ca_job_descriptions WHERE id = $1 AND is_deleted = false`,
      [id],
    );

    if (currentResult.rows.length === 0) {
      throw new NotFoundException(`Job Description with ID ${id} not found.`);
    }
    const currentJd = currentResult.rows[0];

    const currentMin =
      updateDto.exp_min_months !== undefined
        ? updateDto.exp_min_months
        : currentJd.exp_min_months;
    const currentMax =
      updateDto.exp_max_months !== undefined
        ? updateDto.exp_max_months
        : currentJd.exp_max_months;

    if (currentMin != null && currentMax != null && currentMax < currentMin) {
      throw new BadRequestException(
        'Maximum experience cannot be less than minimum experience.',
      );
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let counter = 1;

    const fieldsToUpdate = [
      { key: 'requisition_id', val: updateDto.requisition_id, isText: false },
      { key: 'title', val: updateDto.title, isText: true },
      { key: 'location', val: updateDto.location, isText: true },
      { key: 'work_mode', val: updateDto.work_mode, isText: false },
      { key: 'employment_type', val: updateDto.employment_type, isText: false },
      { key: 'exp_min_months', val: updateDto.exp_min_months, isText: false },
      { key: 'exp_max_months', val: updateDto.exp_max_months, isText: false },
      { key: 'must_have_text', val: updateDto.must_have_text, isText: true },
      {
        key: 'nice_to_have_text',
        val: updateDto.nice_to_have_text,
        isText: true,
      },
      { key: 'job_summary', val: updateDto.job_summary, isText: true },
      {
        key: 'responsibilities_text',
        val: updateDto.responsibilities_text,
        isText: true,
      },
      { key: 'status', val: updateDto.status, isText: false },
      { key: 'owner_user_id', val: updateDto.owner_user_id, isText: false },
    ];

    for (const field of fieldsToUpdate) {
      if (field.val !== undefined) {
        updateFields.push(`${field.key} = $${counter++}`);
        if (field.isText && typeof field.val === 'string') {
          const isRichText = [
            'must_have_text',
            'nice_to_have_text',
            'job_summary',
            'responsibilities_text',
          ].includes(field.key);
          const cleaned = isRichText
            ? this.cleanHtml(field.val)
            : this.cleanText(field.val);
          if (field.key === 'title' && !cleaned) {
            throw new BadRequestException(
              'Job title is required and cannot be conditionally empty.',
            );
          }
          values.push(cleaned);
        } else {
          values.push(field.val);
        }
      }
    }

    if (updateDto.status && updateDto.status !== currentJd.status) {
      if (updateDto.status === 'open' || updateDto.status === 'published') {
        if (!currentJd.published_internal_at) {
          updateFields.push(`published_internal_at = $${counter++}`);
          values.push(new Date());
        }
      }
    }

    if (updateFields.length === 0) {
      return currentJd;
    }

    updateFields.push(`updated_by = $${counter++}`);
    values.push(userId);
    updateFields.push(`updated_at = now()`);

    values.push(id);
    const queryStr = `UPDATE ca_job_descriptions 
                      SET ${updateFields.join(', ')} 
                      WHERE id = $${counter} AND is_deleted = false 
                      RETURNING *`;

    try {
      const result = await this.pool.query(queryStr, values);
      const updatedJd = result.rows[0];

      await this.auditService.log({
        entityType: 'job_descriptions',
        entityId: updatedJd.id,
        action: 'UPDATE',
        beforeJson: currentJd,
        afterJson: updatedJd,
        changedBy: userId,
        reasonContext: 'Job Description updated via API',
      });

      return updatedJd;
    } catch (error: any) {
      if (error.code === '23503') {
        throw new BadRequestException('Invalid reference provided.');
      }
      throw error;
    }
  }

  async updateStatus(id: string, userId: string, status: string) {
    return this.update(id, userId, { status });
  }

  async remove(id: string, userId: string) {
    const currentResult = await this.pool.query(
      `SELECT * FROM ca_job_descriptions WHERE id = $1 AND is_deleted = false`,
      [id],
    );

    if (currentResult.rows.length === 0) {
      throw new NotFoundException(`Job Description with ID ${id} not found.`);
    }
    const currentJd = currentResult.rows[0];

    const result = await this.pool.query(
      `UPDATE ca_job_descriptions 
       SET is_deleted = true, deleted_at = now(), updated_by = $2,
           status = CASE WHEN status != 'closed' THEN 'closed' ELSE status END
       WHERE id = $1 
       RETURNING *`,
      [id, userId],
    );
    const deletedJd = result.rows[0];

    await this.auditService.log({
      entityType: 'job_descriptions',
      entityId: deletedJd.id,
      action: 'DELETE',
      beforeJson: currentJd,
      afterJson: deletedJd,
      changedBy: userId,
      reasonContext: 'Job Description soft-deleted via API',
    });

    return { message: 'Job Description successfully archived.' };
  }

  async getRequisitionOptions() {
    const result = await this.pool.query(
      `SELECT id, code, title
       FROM ca_job_requisitions
       WHERE is_deleted = false
       ORDER BY title ASC`,
    );
    return result.rows;
  }

  async findMatchesForJob(jobId: string): Promise<any> {
    const incrementalResult = await this.matchingService.findMatches(jobId);
    const matches = incrementalResult.matches;
    return this.getDetailedMatches(jobId, matches);
  }

  async findStoredMatchesForJob(jobId: string): Promise<any> {
    // Verify Job Description exists
    const jdCheck = await this.pool.query(
      `SELECT id FROM ca_job_descriptions WHERE id = $1 AND is_deleted = false`,
      [jobId],
    );
    if (jdCheck.rows.length === 0) {
      throw new NotFoundException(`Job description ${jobId} not found`);
    }

    const storedMatches = await this.matchingService.getStoredMatches(jobId);
    const matches = storedMatches
      .map((m) => ({
        candidateId: m.candidateId,
        rating: m.rating,
        createdAt: m.createdAt,
      }))
      .sort((a, b) => b.rating - a.rating);

    return this.getDetailedMatches(jobId, matches);
  }

  async rematchJob(jobId: string): Promise<any> {
    // Clear all existing matches for this JD
    await this.pool.query(
      `DELETE FROM ca_job_candidate_matches WHERE job_id = $1`,
      [jobId],
    );
    // Run find matches to recalculate all active candidates
    return this.findMatchesForJob(jobId);
  }

  private async getDetailedMatches(
    jobId: string,
    matches: any[],
  ): Promise<any> {
    if (matches.length === 0) {
      return {
        jd_id: jobId,
        matches: [],
        total: 0,
      };
    }

    const candidateIds = matches.map((m: any) => m.candidateId);

    // Fetch full candidate details for these matches using the existing tag overlap logic, but scoped to these candidates!
    const query = `
      WITH jd_skills AS (
        SELECT tag_id, is_starred FROM ca_entity_tags WHERE entity_type = 'job_description' AND entity_id = $1
      ),
      jd_skill_count AS (
        SELECT COUNT(*)::float as total_count FROM jd_skills
      ),
      jd_must_have_skills AS (
        SELECT tag_id FROM jd_skills WHERE is_starred = true
      ),
      candidate_matches AS (
        SELECT 
          c.id as candidate_id,
          c.full_name,
          COALESCE(c.current_designation, '') as past_role,
          c.current_ctc,
          c.expected_ctc,
          c.notice_period_days,
          COUNT(DISTINCT et.tag_id)::float as overlap_count,
          COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.type = 'skill' AND t.is_deleted = false AND t.active = true), '{}') as skills
        FROM ca_candidates c
        JOIN ca_entity_tags et ON et.entity_type = 'candidate' AND et.entity_id = c.id
        JOIN jd_skills js ON js.tag_id = et.tag_id

        LEFT JOIN ca_entity_tags et_all ON et_all.entity_type = 'candidate' AND et_all.entity_id = c.id
        LEFT JOIN ca_tags t ON t.id = et_all.tag_id
        WHERE c.status = 'active'
          AND c.id = ANY($2::uuid[])
          AND NOT EXISTS (
            SELECT 1 FROM public.candidate_job_stages cjs
            JOIN public.ca_job_postings jp ON cjs.job_posting_id = jp.id
            WHERE cjs.candidate_id = c.id 
              AND jp.jd_id = $1 
              AND cjs.stage != 'rejected'
              AND cjs.deleted_at IS NULL
          )
        GROUP BY c.id, c.full_name, c.current_designation, c.current_ctc, c.expected_ctc, c.notice_period_days
        HAVING (
          SELECT COUNT(*) FROM jd_must_have_skills
        ) = COUNT(DISTINCT et.tag_id) FILTER (
          WHERE et.tag_id IN (SELECT tag_id FROM jd_must_have_skills)
        )
      )
      SELECT 
        m.candidate_id,
        m.full_name,
        m.past_role,
        m.current_ctc,
        m.expected_ctc,
        m.notice_period_days,
        m.skills,
        COALESCE(jc.total_count, 0) as total_jd_tags,
        CASE 
          WHEN COALESCE(jc.total_count, 0) = 0 THEN 0.0
          ELSE (m.overlap_count / jc.total_count) * 100.0
        END as similarity_score
      FROM candidate_matches m
      CROSS JOIN jd_skill_count jc
    `;

    const res = await this.pool.query(query, [jobId, candidateIds]);

    // Map candidate details and assign the ratings
    const detailedMatches = res.rows.map((row) => {
      const matchData = matches.find(
        (m: any) => m.candidateId === row.candidate_id,
      );
      const rating = matchData
        ? matchData.rating
        : Math.round(parseFloat(row.similarity_score));

      const overallMatchScore = Math.round((rating / 10.0) * 10) / 10; // 0-10 scale

      let confidence: 'high' | 'medium' | 'low' = 'low';
      if (overallMatchScore >= 7) {
        confidence = 'high';
      } else if (overallMatchScore >= 4) {
        confidence = 'medium';
      }

      return {
        candidate_id: row.candidate_id,
        full_name: row.full_name,
        past_role: row.past_role,
        similarity_score: rating,
        confidence,
        current_ctc: row.current_ctc ? parseFloat(row.current_ctc) : undefined,
        expected_ctc: row.expected_ctc
          ? parseFloat(row.expected_ctc)
          : undefined,
        notice_period_days:
          row.notice_period_days != null
            ? parseInt(row.notice_period_days)
            : undefined,
        skills: row.skills,
        overall_match_score: overallMatchScore,
      };
    });

    // Sort detailedMatches in descending order of rating
    detailedMatches.sort((a, b) => b.similarity_score - a.similarity_score);

    return {
      jd_id: jobId,
      matches: detailedMatches,
      total: detailedMatches.length,
    };
  }

  async isCandidateActiveInThisJD(candidateId: string, jobId: string) {
    const res = await this.pool.query(
      `SELECT 1 FROM public.ca_candidate_job_stages cjs
       JOIN public.ca_job_postings jp ON cjs.job_posting_id = jp.id
       WHERE cjs.candidate_id = $1 
         AND jp.jd_id = $2 
         AND cjs.stage != 'rejected'
         AND cjs.deleted_at IS NULL
       LIMIT 1`,
      [candidateId, jobId],
    );
    return res.rows.length > 0;
  }
}
