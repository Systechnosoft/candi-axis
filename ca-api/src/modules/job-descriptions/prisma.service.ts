/**
 * File: ats-api/src/modules/job-descriptions/prisma.service.ts
 * Modified: May 2026
 * Changes:
 * - Added a mock definition for jobCandidateMatch to support standard model interface simulation.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';

@Injectable()
export class PrismaService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  get jobDescription() {
    return {
      findUnique: async (args: { where: { id: string } }) => {
        const res = await this.pool.query(
          `SELECT id, title FROM job_descriptions WHERE id = $1 AND is_deleted = false`,
          [args.where.id],
        );
        if (res.rows.length === 0) return null;
        return {
          id: res.rows[0].id,
          title: res.rows[0].title,
        };
      },
    };
  }

  get application() {
    return {
      findMany: async (args?: any) => {
        const res = await this.pool.query(
          `SELECT a.candidate_id as "candidateId", a.jd_id as "jobDescriptionId", a.stage as "currentStage", a.created_at as "createdAt",
                  c.full_name as "candidateName", jd.title as "jobDescriptionTitle"
           FROM applications a
           JOIN candidates c ON a.candidate_id = c.id
           JOIN job_descriptions jd ON a.jd_id = jd.id
           WHERE a.is_deleted = false AND c.is_deleted = false AND jd.is_deleted = false`,
        );
        return res.rows.map((row) => ({
          candidateId: row.candidateId,
          createdAt: row.createdAt,
          candidate: {
            name: row.candidateName,
          },
          jobDescription: {
            title: row.jobDescriptionTitle,
          },
        }));
      },
      findFirst: async (args: {
        where: {
          candidateId: string;
          jobDescriptionId: string;
          currentStage?: { not: string };
        };
      }) => {
        const stageFilter = args.where.currentStage
          ? args.where.currentStage.not.toLowerCase()
          : null;
        let query = `SELECT id FROM applications WHERE candidate_id = $1 AND jd_id = $2 AND is_deleted = false`;
        const params = [args.where.candidateId, args.where.jobDescriptionId];
        if (stageFilter) {
          query += ` AND LOWER(stage) != $3`;
          params.push(stageFilter);
        }
        const res = await this.pool.query(query, params);
        return res.rows.length > 0 ? res.rows[0] : null;
      },
    };
  }

  get jobCandidateMatch() {
    return {
      findMany: async (args: { where: { jobId: string; isActive?: boolean } }) => {
        const res = await this.pool.query(
          `SELECT id, job_id as "jobId", candidate_id as "candidateId", rating, created_at as "createdAt"
           FROM job_candidate_matches
           WHERE job_id = $1 AND is_active = $2 AND deleted_at IS NULL`,
          [args.where.jobId, args.where.isActive ?? true],
        );
        return res.rows.map(row => ({
          id: row.id,
          jobId: row.jobId,
          candidateId: row.candidateId,
          rating: parseFloat(row.rating),
          createdAt: row.createdAt,
        }));
      },
      createMany: async (args: { data: Array<{ jobId: string; candidateId: string; rating: number }> }) => {
        if (args.data.length === 0) return;
        const values: any[] = [];
        const placeholders: string[] = [];
        let counter = 1;
        for (const match of args.data) {
          placeholders.push(`($${counter++}, $${counter++}, $${counter++})`);
          values.push(match.jobId, match.candidateId, match.rating);
        }
        const query = `
          INSERT INTO job_candidate_matches (job_id, candidate_id, rating)
          VALUES ${placeholders.join(', ')}
          ON CONFLICT (job_id, candidate_id)
          DO UPDATE SET rating = EXCLUDED.rating, updated_at = now()
        `;
        await this.pool.query(query, values);
      }
    };
  }
}
