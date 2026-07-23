import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';

export interface DuplicateMatchResult {
  hasHighMatch: boolean;
  hasMediumMatch: boolean;
  matches: Array<{
    candidateId: string;
    matchLevel: 'high' | 'medium';
    confidenceScore: number;
    signals: object;
  }>;
}

@Injectable()
export class CandidateDuplicateService {
  constructor(@Inject(PG_POOL) private pool: Pool) {}

  async detectDuplicates(
    emailNorm?: string,
    phoneNorm?: string,
    fullName?: string,
  ): Promise<DuplicateMatchResult> {
    const result: DuplicateMatchResult = {
      hasHighMatch: false,
      hasMediumMatch: false,
      matches: [],
    };

    if (!emailNorm && !phoneNorm && !fullName) {
      return result;
    }

    const conditions: string[] = [];
    const values: any[] = [];
    let counter = 1;

    if (emailNorm) {
      conditions.push(`email_normalized = $${counter++}`);
      values.push(emailNorm);
    }
    if (phoneNorm) {
      conditions.push(`phone_normalized = $${counter++}`);
      values.push(phoneNorm);
    }
    if (fullName) {
      // similarity() requires pg_trgm which is active
      conditions.push(`similarity(full_name, $${counter}) > 0.6`);
      values.push(fullName);
      counter++;
    }

    const query = `
      SELECT id, email_normalized, phone_normalized, full_name,
             ${fullName ? `similarity(full_name, $${values.length}) AS name_sim` : '0 AS name_sim'}
      FROM candidates
      WHERE is_deleted = false AND (${conditions.join(' OR ')})
      LIMIT 10
    `;

    const res = await this.pool.query(query, values);

    for (const row of res.rows) {
      const isEmailMatch = emailNorm && row.email_normalized === emailNorm;
      const isPhoneMatch = phoneNorm && row.phone_normalized === phoneNorm;

      const isHigh = isEmailMatch || isPhoneMatch;
      const matchLevel = isHigh ? 'high' : 'medium';

      const confScore = isHigh
        ? 1.0
        : row.name_sim
          ? parseFloat(row.name_sim)
          : 0.6;

      const signals = {
        email_matched: isEmailMatch,
        phone_matched: isPhoneMatch,
        name_similarity: row.name_sim ? parseFloat(row.name_sim) : 0,
      };

      result.matches.push({
        candidateId: row.id,
        matchLevel,
        confidenceScore: confScore,
        signals,
      });

      if (isHigh) result.hasHighMatch = true;
      if (!isHigh) result.hasMediumMatch = true;
    }

    return result;
  }

  async recordDuplicateMatch(
    incomingCandidateId: string | null,
    matchedCandidateId: string,
    submissionRef: string | null,
    matchLevel: 'high' | 'medium' | 'low',
    confidenceScore: number,
    signals: object,
    client?: any,
  ) {
    const dbClient = client || this.pool;
    const query = `
      INSERT INTO duplicate_matches (
        incoming_candidate_id,
        matched_candidate_id,
        candidate_submission_ref,
        match_level,
        confidence_score,
        matching_signals,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `;
    const values = [
      incomingCandidateId,
      matchedCandidateId,
      submissionRef,
      matchLevel,
      confidenceScore,
      JSON.stringify(signals),
    ];

    const res = await dbClient.query(query, values);
    return res.rows[0];
  }
}
