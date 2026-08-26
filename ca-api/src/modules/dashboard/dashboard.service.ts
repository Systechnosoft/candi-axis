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
        al.id::text as id,
        al.entity_type,
        al.entity_id::text as entity_id,
        (al.before_json->>'status')::text as from_status,
        COALESCE((al.after_json->>'status')::text, al.action) as to_status,
        al.changed_at as changed_at,
        al.reason_context as reason,
        u.full_name as user_name
      FROM ca_audit_logs al
      LEFT JOIN ca_users u ON al.changed_by = u.id
    `;
    const params: any[] = [];
    
    if (!isSuperAdmin) {
      query += ` WHERE al.changed_by = $1`;
      params.push(userId);
    }
    
    query += `
      ORDER BY al.changed_at DESC
      LIMIT 10
    `;
    
    const res = await this.pool.query(query, params);
    return res.rows;
  }
}
