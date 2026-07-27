import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';

export interface AuditLogParams {
  orgId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  changedBy?: string | null;
  beforeJson?: Record<string, any> | null;
  afterJson?: Record<string, any> | null;
  reasonContext?: string | null;
}

@Injectable()
export class AuditService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async log(params: AuditLogParams): Promise<void> {
    const {
      orgId,
      entityType,
      entityId,
      action,
      changedBy,
      beforeJson,
      afterJson,
      reasonContext,
    } = params;

    // Default to the main bootstrap organisation ID if none is provided
    const finalOrgId = orgId || '7af2ebf4-6888-4757-a585-bcd9115bb0da';

    await this.pool.query(
      `INSERT INTO ca_audit_logs
         (org_id, entity_type, entity_id, action, before_json, after_json, changed_by, reason_context)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        finalOrgId,
        entityType,
        entityId,
        action,
        beforeJson ?? null,
        afterJson ?? null,
        changedBy ?? null,
        reasonContext ?? null,
      ],
    );
  }
}
