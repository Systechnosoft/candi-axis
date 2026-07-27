import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Retrieves all active stored matches for a specific Job Description.
   */
  async getStoredMatches(
    jobId: string,
  ): Promise<Array<{ candidateId: string; rating: number; createdAt: Date }>> {
    const query = `
      SELECT 
        jcm.candidate_id as "candidateId", 
        jcm.rating, 
        jcm.created_at as "createdAt" 
      FROM ca_job_candidate_matches jcm
      WHERE jcm.job_id = $1 AND jcm.is_active = true AND jcm.deleted_at IS NULL
        AND (
          SELECT COUNT(*) FROM ca_entity_tags 
          WHERE entity_type = 'job_description' AND entity_id = $1 AND is_starred = true
        ) = (
          SELECT COUNT(DISTINCT et.tag_id) FROM ca_entity_tags et
          WHERE et.entity_type = 'candidate' AND et.entity_id = jcm.candidate_id
            AND et.tag_id IN (
              SELECT tag_id FROM ca_entity_tags 
              WHERE entity_type = 'job_description' AND entity_id = $1 AND is_starred = true
            )
        )
    `;
    const res = await this.pool.query(query, [jobId]);
    return res.rows.map((row) => ({
      candidateId: row.candidateId,
      rating: parseFloat(row.rating),
      createdAt: row.createdAt,
    }));
  }

  /**
   * Bulk inserts or updates matches in a single query.
   */
  async storeMatches(
    orgId: string,
    matches: Array<{ jobId: string; candidateId: string; rating: number }>,
  ): Promise<void> {
    if (matches.length === 0) return;

    const values: any[] = [orgId];
    const placeholders: string[] = [];
    let counter = 2;
    for (const match of matches) {
      placeholders.push(`($1, $${counter++}, $${counter++}, $${counter++})`);
      values.push(match.jobId, match.candidateId, match.rating);
    }

    const query = `
      INSERT INTO ca_job_candidate_matches (org_id, job_id, candidate_id, rating)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (job_id, candidate_id) 
      DO UPDATE SET rating = EXCLUDED.rating, updated_at = now(), last_processed_at = now()
    `;
    await this.pool.query(query, values);
  }

  /**
   * Returns candidateIds that are already matched and stored for this job.
   */
  async getAlreadyProcessedCandidateIds(jobId: string): Promise<string[]> {
    const query = `
      SELECT candidate_id as "candidateId" 
      FROM ca_job_candidate_matches 
      WHERE job_id = $1 AND is_active = true AND deleted_at IS NULL
    `;
    const res = await this.pool.query(query, [jobId]);
    return res.rows.map((row) => row.candidateId);
  }

  async findMatches(jobId: string): Promise<any> {
    const startTime = Date.now();

    const jdCheck = await this.pool.query(
      `SELECT id, org_id FROM ca_job_descriptions WHERE id = $1 AND is_deleted = false`,
      [jobId],
    );
    if (jdCheck.rows.length === 0) {
      throw new NotFoundException(`Job description ${jobId} not found`);
    }
    const orgId = jdCheck.rows[0].org_id;

    const processedCandidates =
      await this.getAlreadyProcessedCandidateIds(jobId);

    const allCandidatesRes = await this.pool.query(
      `SELECT id FROM ca_candidates WHERE status = 'active' AND is_deleted = false`,
    );
    const allCandidates = allCandidatesRes.rows;

    const onlyNew = allCandidates.filter(
      (c) => !processedCandidates.includes(c.id),
    );
    const newCandidateIds = onlyNew.map((c) => c.id);

    if (newCandidateIds.length > 0) {
      const matchingQuery = `
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
            COUNT(DISTINCT et.tag_id)::float as overlap_count
          FROM ca_candidates c
          JOIN ca_entity_tags et ON et.entity_type = 'candidate' AND et.entity_id = c.id
          JOIN jd_skills js ON js.tag_id = et.tag_id
          WHERE c.status = 'active'
            AND c.is_deleted = false
            AND c.id = ANY($2::uuid[])
          GROUP BY c.id
          HAVING (
            SELECT COUNT(*) FROM jd_must_have_skills
          ) = COUNT(DISTINCT et.tag_id) FILTER (
            WHERE et.tag_id IN (SELECT tag_id FROM jd_must_have_skills)
          )
        )
        SELECT 
          m.candidate_id,
          CASE 
            WHEN COALESCE(jc.total_count, 0) = 0 THEN 0.0
            ELSE (m.overlap_count / jc.total_count) * 100.0
          END as similarity_score
        FROM candidate_matches m
        CROSS JOIN jd_skill_count jc
      `;
      const res = await this.pool.query(matchingQuery, [
        jobId,
        newCandidateIds,
      ]);

      const matchesToStore = res.rows.map((row) => {
        const rating = Math.round(parseFloat(row.similarity_score) * 10) / 10;
        return {
          jobId,
          candidateId: row.candidate_id,
          rating,
        };
      });

      if (matchesToStore.length > 0) {
        await this.storeMatches(orgId, matchesToStore);
      }
    }

    const storedMatches = await this.getStoredMatches(jobId);

    const timeTaken = Date.now() - startTime;

    this.logger.log(
      `Job-Candidate Matching for Job ID ${jobId} finished: ` +
        `stored matches found = ${storedMatches.length}, ` +
        `new candidates processed = ${newCandidateIds.length}, ` +
        `time taken = ${timeTaken}ms`,
    );

    const formattedMatches = storedMatches
      .map((m) => ({
        candidateId: m.candidateId,
        rating: m.rating,
        createdAt: m.createdAt,
      }))
      .sort((a, b) => b.rating - a.rating);

    return {
      jobId,
      matches: formattedMatches,
    };
  }
}
