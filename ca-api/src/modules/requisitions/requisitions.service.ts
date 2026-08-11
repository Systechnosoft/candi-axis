import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { UpdateRequisitionDto } from './dto/update-requisition.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RequisitionsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly auditService: AuditService,
  ) {}

  private cleanText(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
  }

  async createRequisition(userId: string, createDto: CreateRequisitionDto) {
    const cleanedCode = createDto.code ? this.cleanText(createDto.code) : null;
    const cleanedTitle = this.cleanText(createDto.title);
    const cleanedDepartment = this.cleanText(createDto.department);
    const cleanedStatusReason = createDto.status_reason
      ? this.cleanText(createDto.status_reason)
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
      let openedAt = null;
      let closedAt = null;
      if (status === 'open') openedAt = new Date();
      if (status === 'closed') closedAt = new Date();

      const result = await this.pool.query(
        `INSERT INTO ca_job_requisitions (
          org_id, code, title, department, openings_count, priority, 
          hiring_manager_id, owner_user_id, status, status_reason, 
          opened_at, closed_at, created_by, updated_by
        ) VALUES ($1, COALESCE($2, 'REQ-' || lpad(nextval('job_requisition_code_seq')::text, 3, '0')), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13) 
         RETURNING *`,
        [
          orgId,
          cleanedCode,
          cleanedTitle,
          cleanedDepartment,
          createDto.openings_count,
          createDto.priority,
          createDto.hiring_manager_id,
          createDto.owner_user_id || null,
          status,
          cleanedStatusReason,
          openedAt,
          closedAt,
          userId,
        ],
      );
      const newReq = result.rows[0];

      await this.auditService.log({
        entityType: 'job_requisitions',
        entityId: newReq.id,
        action: 'CREATE',
        beforeJson: null,
        afterJson: newReq,
        changedBy: userId,
        reasonContext: 'Job Requisition created via API',
      });

      return newReq;
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException(
          `Requisition with code "${createDto.code}" already exists.`,
        );
      }
      if (error.code === '23503') {
        throw new BadRequestException(
          `Invalid reference provided for hiring manager or owner.`,
        );
      }
      throw error;
    }
  }

  async getRequisitions(query: {
    search?: string;
    status?: string;
    department?: string;
    activeOnly?: string;
  }) {
    const conditions: string[] = [];
    const values: any[] = [];
    let counter = 1;

    // Filter by soft-delete
    if (query.activeOnly !== 'false') {
      conditions.push(`req.is_deleted = false`);
    }

    if (query.status) {
      conditions.push(`req.status = $${counter++}`);
      values.push(query.status);
    }

    if (query.department) {
      conditions.push(`req.department = $${counter++}`);
      values.push(query.department);
    }

    if (query.search) {
      conditions.push(`(req.title ILIKE $${counter} OR req.code ILIKE $${counter})`);
      values.push(`%${query.search}%`);
      counter++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.pool.query(
      `SELECT req.id, req.code, req.title, req.department, req.openings_count, req.priority, 
              req.hiring_manager_id, req.owner_user_id, req.status, req.status_reason, 
              req.opened_at, req.closed_at, req.created_at, req.updated_at,
              req.is_deleted, u.full_name as updated_by_name
       FROM ca_job_requisitions req
       LEFT JOIN ca_users u ON req.updated_by = u.id
       ${whereClause} 
       ORDER BY req.updated_at DESC`,
      values,
    );

    return result.rows;
  }

  async getRequisitionById(id: string) {
    const result = await this.pool.query(
      `SELECT * FROM ca_job_requisitions WHERE id = $1 AND is_deleted = false`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Requisition with ID ${id} not found.`);
    }

    return result.rows[0];
  }

  async updateRequisition(
    id: string,
    userId: string,
    updateDto: UpdateRequisitionDto,
  ) {
    const currentResult = await this.pool.query(
      `SELECT * FROM ca_job_requisitions WHERE id = $1 AND is_deleted = false`,
      [id],
    );

    if (currentResult.rows.length === 0) {
      throw new NotFoundException(`Requisition with ID ${id} not found.`);
    }
    const currentReq = currentResult.rows[0];

    const updateFields: string[] = [];
    const values: any[] = [];
    let counter = 1;

    // code field is auto-generated and protected from edits; ignore it in updates
    if (updateDto.title !== undefined) {
      updateFields.push(`title = $${counter++}`);
      values.push(this.cleanText(updateDto.title));
    }
    if (updateDto.department !== undefined) {
      updateFields.push(`department = $${counter++}`);
      values.push(this.cleanText(updateDto.department));
    }
    if (updateDto.openings_count !== undefined) {
      updateFields.push(`openings_count = $${counter++}`);
      values.push(updateDto.openings_count);
    }
    if (updateDto.priority !== undefined) {
      updateFields.push(`priority = $${counter++}`);
      values.push(updateDto.priority);
    }
    if (updateDto.hiring_manager_id !== undefined) {
      updateFields.push(`hiring_manager_id = $${counter++}`);
      values.push(updateDto.hiring_manager_id);
    }
    if (updateDto.owner_user_id !== undefined) {
      updateFields.push(`owner_user_id = $${counter++}`);
      values.push(updateDto.owner_user_id);
    }
    if (updateDto.status !== undefined) {
      updateFields.push(`status = $${counter++}`);
      values.push(updateDto.status);
    }
    if (updateDto.status_reason !== undefined) {
      updateFields.push(`status_reason = $${counter++}`);
      values.push(
        updateDto.status_reason
          ? this.cleanText(updateDto.status_reason)
          : null,
      );
    }

    if (updateDto.status && updateDto.status !== currentReq.status) {
      if (updateDto.status === 'open' && !currentReq.opened_at) {
        updateFields.push(`opened_at = $${counter++}`);
        values.push(new Date());
      }
      if (updateDto.status === 'closed' && !currentReq.closed_at) {
        updateFields.push(`closed_at = $${counter++}`);
        values.push(new Date());
      }
    }

    if (updateFields.length === 0) {
      return currentReq;
    }

    updateFields.push(`updated_by = $${counter++}`);
    values.push(userId);

    values.push(id);
    const queryStr = `UPDATE ca_job_requisitions 
                      SET ${updateFields.join(', ')} 
                      WHERE id = $${counter} AND is_deleted = false 
                      RETURNING *`;

    try {
      const result = await this.pool.query(queryStr, values);
      const updatedReq = result.rows[0];

      await this.auditService.log({
        entityType: 'job_requisitions',
        entityId: updatedReq.id,
        action: 'UPDATE',
        beforeJson: currentReq,
        afterJson: updatedReq,
        changedBy: userId,
        reasonContext: 'Job Requisition updated via API',
      });

      return updatedReq;
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException(`Requisition code already exists.`);
      }
      if (error.code === '23503') {
        throw new BadRequestException(
          `Invalid reference provided for hiring manager or owner.`,
        );
      }
      throw error;
    }
  }

  async deleteRequisition(id: string, userId: string) {
    const currentResult = await this.pool.query(
      `SELECT * FROM ca_job_requisitions WHERE id = $1 AND is_deleted = false`,
      [id],
    );

    if (currentResult.rows.length === 0) {
      throw new NotFoundException(`Requisition with ID ${id} not found.`);
    }
    const currentReq = currentResult.rows[0];

    const result = await this.pool.query(
      `UPDATE ca_job_requisitions 
       SET is_deleted = true, deleted_at = now(), updated_by = $2,
           status = CASE WHEN status != 'closed' THEN 'closed' ELSE status END,
           closed_at = CASE WHEN closed_at IS NULL THEN now() ELSE closed_at END
       WHERE id = $1 
       RETURNING *`,
      [id, userId],
    );
    const deletedReq = result.rows[0];

    await this.auditService.log({
      entityType: 'job_requisitions',
      entityId: deletedReq.id,
      action: 'DELETE',
      beforeJson: currentReq,
      afterJson: deletedReq,
      changedBy: userId,
      reasonContext: 'Job Requisition soft-deleted via API',
    });

    return { message: 'Requisition successfully archived.' };
  }

  async restoreRequisition(id: string, userId: string) {
    const currentResult = await this.pool.query(
      `SELECT * FROM ca_job_requisitions WHERE id = $1 AND is_deleted = true`,
      [id],
    );

    if (currentResult.rows.length === 0) {
      throw new NotFoundException(`Archived Requisition with ID ${id} not found.`);
    }
    const currentReq = currentResult.rows[0];

    const result = await this.pool.query(
      `UPDATE ca_job_requisitions 
       SET is_deleted = false, updated_by = $2
       WHERE id = $1 
       RETURNING *`,
      [id, userId],
    );
    const restoredReq = result.rows[0];

    await this.auditService.log({
      entityType: 'job_requisitions',
      entityId: restoredReq.id,
      action: 'UPDATE',
      beforeJson: currentReq,
      afterJson: restoredReq,
      changedBy: userId,
      reasonContext: 'Job Requisition restored via API',
    });

    return { message: 'Requisition successfully restored.' };
  }
}
