import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';
import { CreateJobPostingDto } from './dto/create-job-posting.dto';
import { UpdateJobPostingDto } from './dto/update-job-posting.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class JobPostingsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly auditService: AuditService,
  ) {}

  private cleanText(text: string): string {
    return text ? text.trim().replace(/ +/g, ' ') : '';
  }

  async create(userId: string, createDto: CreateJobPostingDto) {
    const cleanedName = this.cleanText(createDto.name);
    if (!cleanedName) {
      throw new BadRequestException('Job Posting name is required.');
    }

    let cleanedCode = null;
    if (createDto.code) {
      cleanedCode = this.cleanText(createDto.code);
      if (cleanedCode) {
        const existingCode = await this.pool.query(
          `SELECT id FROM ca_job_postings WHERE code = $1`,
          [cleanedCode],
        );
        if (existingCode.rows.length > 0) {
          throw new BadRequestException(
            `A Job Posting with ID/code "${cleanedCode}" already exists.`,
          );
        }
      }
    }

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
      // Check if jd_id exists and isn't already linked (since jd_id is UNIQUE in job_postings schema)
      const existingJd = await this.pool.query(
        `SELECT id FROM ca_job_postings WHERE jd_id = $1`,
        [createDto.jd_id],
      );
      if (existingJd.rows.length > 0) {
        throw new BadRequestException(
          'A Job Posting already exists for this Job Description.',
        );
      }

      const result = await this.pool.query(
        `INSERT INTO ca_job_postings (
          org_id, code, name, description, jd_id, is_active, created_by, updated_by, hr_ids, interviewer_ids
        ) VALUES ($1, COALESCE($2, 'JP-' || lpad(nextval('job_posting_code_seq')::text, 3, '0')), $3, $4, $5, $6, $7, $7, $8, $9) 
         RETURNING *`,
        [
          orgId,
          cleanedCode || null,
          cleanedName,
          createDto.description || null,
          createDto.jd_id,
          createDto.is_active ?? true,
          userId,
          createDto.hr_ids || [],
          createDto.interviewer_ids || [],
        ],
      );
      const newPosting = result.rows[0];

      await this.auditService.log({
        entityType: 'job_postings',
        entityId: newPosting.id,
        action: 'CREATE',
        beforeJson: null,
        afterJson: newPosting,
        changedBy: userId,
        reasonContext: 'Job Posting created via API',
      });

      return newPosting;
    } catch (error: any) {
      if (error.status) throw error;
      if (error.code === '23503') {
        throw new BadRequestException(
          'Invalid reference provided for Job Description.',
        );
      }
      throw error;
    }
  }

  async findAll(query?: { search?: string; jd_id?: string }) {
    const conditions: string[] = [];
    const values: any[] = [];
    let counter = 1;

    if (query?.search) {
      conditions.push(
        `(jp.name ILIKE $${counter} OR jd.title ILIKE $${counter})`,
      );
      values.push(`%${query.search}%`);
      counter++;
    }

    if (query?.jd_id) {
      conditions.push(`jp.jd_id = $${counter}`);
      values.push(query.jd_id);
      counter++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.pool.query(
      `SELECT jp.id, jp.code, jp.name, jp.description, jp.jd_id, jp.is_active, jp.created_at, jp.updated_at,
              jp.hr_ids, jp.interviewer_ids,
              jd.title as jd_title, jd.code as jd_code
       FROM ca_job_postings jp
       LEFT JOIN ca_job_descriptions jd ON jp.jd_id = jd.id
       ${whereClause}
       ORDER BY jp.created_at DESC`,
      values,
    );

    return result.rows;
  }

  async findOne(id: string) {
    const result = await this.pool.query(
      `SELECT jp.*, jd.title as jd_title, jd.code as jd_code
       FROM ca_job_postings jp
       LEFT JOIN ca_job_descriptions jd ON jp.jd_id = jd.id
       WHERE jp.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Job Posting with ID ${id} not found.`);
    }

    return result.rows[0];
  }

  async update(id: string, userId: string, updateDto: UpdateJobPostingDto) {
    const currentResult = await this.pool.query(
      `SELECT * FROM ca_job_postings WHERE id = $1`,
      [id],
    );

    if (currentResult.rows.length === 0) {
      throw new NotFoundException(`Job Posting with ID ${id} not found.`);
    }
    const currentPosting = currentResult.rows[0];

    const updateFields: string[] = [];
    const values: any[] = [];
    let counter = 1;

    const fieldsToUpdate = [
      { key: 'name', val: updateDto.name, isText: true },
      { key: 'description', val: updateDto.description, isText: false },
      { key: 'jd_id', val: updateDto.jd_id, isText: false },
      { key: 'is_active', val: updateDto.is_active, isText: false },
      { key: 'hr_ids', val: updateDto.hr_ids, isText: false },
      { key: 'interviewer_ids', val: updateDto.interviewer_ids, isText: false },
    ];

    for (const field of fieldsToUpdate) {
      if (field.val !== undefined) {
        updateFields.push(`${field.key} = $${counter++}`);
        if (field.isText && typeof field.val === 'string') {
          const cleaned = this.cleanText(field.val);
          if (field.key === 'name' && !cleaned) {
            throw new BadRequestException('Job Posting name cannot be empty.');
          }
          values.push(cleaned);
        } else {
          values.push(field.val);
        }
      }
    }

    if (updateFields.length === 0) {
      return currentPosting;
    }

    updateFields.push(`updated_by = $${counter++}`);
    values.push(userId);
    updateFields.push(`updated_at = now()`);

    values.push(id);
    const queryStr = `UPDATE ca_job_postings 
                      SET ${updateFields.join(', ')} 
                      WHERE id = $${counter} 
                      RETURNING *`;

    try {
      const result = await this.pool.query(queryStr, values);
      const updatedPosting = result.rows[0];

      await this.auditService.log({
        entityType: 'job_postings',
        entityId: updatedPosting.id,
        action: 'UPDATE',
        beforeJson: currentPosting,
        afterJson: updatedPosting,
        changedBy: userId,
        reasonContext: 'Job Posting updated via API',
      });

      return updatedPosting;
    } catch (error: any) {
      if (error.code === '23503') {
        throw new BadRequestException(
          'Invalid reference provided for Job Description.',
        );
      }
      throw error;
    }
  }

  async remove(id: string, userId: string) {
    const currentResult = await this.pool.query(
      `SELECT * FROM ca_job_postings WHERE id = $1`,
      [id],
    );

    if (currentResult.rows.length === 0) {
      throw new NotFoundException(`Job Posting with ID ${id} not found.`);
    }
    const currentPosting = currentResult.rows[0];

    await this.pool.query(`DELETE FROM ca_job_postings WHERE id = $1`, [id]);

    await this.auditService.log({
      entityType: 'job_postings',
      entityId: id,
      action: 'DELETE',
      beforeJson: currentPosting,
      afterJson: null,
      changedBy: userId,
      reasonContext: 'Job Posting deleted via API',
    });

    return { message: 'Job Posting successfully deleted.' };
  }
}
