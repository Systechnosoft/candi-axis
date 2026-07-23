import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class OffersService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly auditService: AuditService,
  ) {}

  async findAll(params: { search?: string }) {
    let query = `
      SELECT 
        o.*,
        c.full_name as candidate_name,
        jd.title as jd_title,
        req.code as requisition_code
      FROM offers o
      JOIN public.candidate_job_stages a ON o.application_id = a.id
      JOIN candidates c ON a.candidate_id = c.id
      JOIN public.job_postings jp ON a.job_posting_id = jp.id
      JOIN job_descriptions jd ON jp.jd_id = jd.id
      LEFT JOIN job_requisitions req ON jd.requisition_id = req.id
      WHERE o.is_deleted = false
    `;
    const queryParams: any[] = [];
    if (params.search) {
      query += ` AND (c.full_name ILIKE $1 OR jd.title ILIKE $1)`;
      queryParams.push(`%${params.search}%`);
    }
    query += ` ORDER BY o.created_at DESC`;
    const res = await this.pool.query(query, queryParams);
    return res.rows;
  }

  async getPendingApplications() {
    const query = `
      SELECT 
        a.id as application_id,
        c.full_name as candidate_name,
        jd.title as jd_title
      FROM public.candidate_job_stages a
      JOIN candidates c ON a.candidate_id = c.id
      JOIN public.job_postings jp ON a.job_posting_id = jp.id
      JOIN job_descriptions jd ON jp.jd_id = jd.id
      LEFT JOIN offers o ON a.id = o.application_id
      WHERE a.stage = 'offered' 
        AND a.deleted_at IS NULL 
        AND o.id IS NULL
    `;
    const res = await this.pool.query(query);
    return res.rows;
  }

  async create(userId: string, dto: any) {
    const { application_id, offered_ctc, joining_date, offer_valid_till, notes } = dto;
    
    // Check if application exists and is in offered stage
    const appRes = await this.pool.query('SELECT id, stage FROM public.candidate_job_stages WHERE id = $1 AND deleted_at IS NULL', [application_id]);
    if (appRes.rows.length === 0) {
      throw new NotFoundException('Application not found');
    }
    
    // Check for existing offer
    const existing = await this.pool.query('SELECT id FROM offers WHERE application_id = $1 AND is_deleted = false', [application_id]);
    if (existing.rows.length > 0) {
      throw new ConflictException('Offer already exists for this application');
    }

    const query = `
      INSERT INTO offers (application_id, offered_ctc, joining_date, offer_valid_till, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [application_id, offered_ctc, joining_date, offer_valid_till, notes, userId];
    const res = await this.pool.query(query, values);
    const offer = res.rows[0];

    await this.auditService.log({
      entityType: 'offers',
      entityId: offer.id,
      action: 'CREATE',
      changedBy: userId,
      afterJson: offer,
      reasonContext: 'Offer created'
    });

    return offer;
  }

  async updateStatus(id: string, userId: string, status: string) {
    const query = `
      UPDATE offers
      SET status = $1, updated_at = now()
      WHERE id = $2 AND is_deleted = false
      RETURNING *
    `;
    const res = await this.pool.query(query, [status, id]);
    if (res.rows.length === 0) {
      throw new NotFoundException('Offer not found');
    }
    const offer = res.rows[0];

    await this.auditService.log({
      entityType: 'offers',
      entityId: id,
      action: 'UPDATE_STATUS',
      changedBy: userId,
      afterJson: { status },
      reasonContext: `Offer status updated to ${status}`
    });

    return offer;
  }
}
