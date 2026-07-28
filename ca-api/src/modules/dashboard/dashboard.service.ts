import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';

@Injectable()
export class DashboardService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getStats() {
    const queries = {
      openRequisitions:
        "SELECT COUNT(*) FROM ca_job_requisitions WHERE status = 'open' AND is_deleted = false",
      totalCandidates:
        'SELECT COUNT(*) FROM ca_candidates WHERE is_deleted = false',
      draftOffers:
        "SELECT COUNT(*) FROM public.ca_candidate_job_stages WHERE stage = 'offered' AND deleted_at IS NULL",
      interviewing:
        "SELECT COUNT(*) FROM public.ca_candidate_job_stages WHERE stage = 'interviewing' AND deleted_at IS NULL",
    };

    const results = await Promise.all([
      this.pool.query(queries.openRequisitions),
      this.pool.query(queries.totalCandidates),
      this.pool.query(queries.draftOffers),
      this.pool.query(queries.interviewing),
    ]);

    return {
      openRequisitions: parseInt(results[0].rows[0].count, 10),
      totalCandidates: parseInt(results[1].rows[0].count, 10),
      draftOffers: parseInt(results[2].rows[0].count, 10),
      interviewing: parseInt(results[3].rows[0].count, 10),
    };
  }

  async getActivity() {
    const res = await this.pool.query(`
      SELECT 
        sh.id,
        sh.entity_type,
        sh.entity_id,
        sh.from_status,
        sh.to_status,
        sh.changed_at,
        sh.reason,
        u.full_name as user_name
      FROM ca_status_history sh
      LEFT JOIN ca_users u ON sh.changed_by = u.id
      ORDER BY sh.changed_at DESC
      LIMIT 10
    `);
    return res.rows;
  }
}
