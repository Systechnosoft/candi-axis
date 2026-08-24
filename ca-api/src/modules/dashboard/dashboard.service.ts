import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';

@Injectable()
export class DashboardService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getStats() {
    const queries = {
      openJobPostings:
        'SELECT COUNT(*) FROM ca_job_postings WHERE is_active = true',
      totalCandidates:
        'SELECT COUNT(*) FROM ca_candidates WHERE is_deleted = false',
      draftOffers:
        "SELECT COUNT(*) FROM public.ca_candidate_job_stages WHERE stage = 'offered' AND deleted_at IS NULL",
      interviewing:
        "SELECT COUNT(*) FROM public.ca_candidate_job_stages WHERE stage = 'interviewing' AND deleted_at IS NULL",
    };

    const results = await Promise.all([
      this.pool.query(queries.openJobPostings),
      this.pool.query(queries.totalCandidates),
      this.pool.query(queries.draftOffers),
      this.pool.query(queries.interviewing),
    ]);

    return {
      openJobPostings: parseInt(results[0].rows[0].count, 10),
      totalCandidates: parseInt(results[1].rows[0].count, 10),
      draftOffers: parseInt(results[2].rows[0].count, 10),
      interviewing: parseInt(results[3].rows[0].count, 10),
    };
  }

  async getActivity(userId: string) {
    const rolesRes = await this.pool.query(
      `SELECT r.code FROM ca_user_roles ur
       JOIN ca_roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
       [userId]
    );
    const roles = rolesRes.rows.map(r => r.code);
    const isSuperAdmin = roles.includes('super_admin');
    
    let query = `
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
    `;
    const params: any[] = [];
    
    if (!isSuperAdmin) {
      query += ` WHERE sh.changed_by = $1`;
      params.push(userId);
    }
    
    query += `
      ORDER BY sh.changed_at DESC
      LIMIT 10
    `;
    
    const res = await this.pool.query(query, params);
    return res.rows;
  }
}
