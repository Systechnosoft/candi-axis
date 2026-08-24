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

export function normalizeCandidateEmail(email?: string): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

export function normalizeCandidatePhone(phone?: string): string | null {
  if (!phone) return null;
  return phone.replace(/[^0-9+]/g, '');
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
      FROM ca_candidates
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

  async checkExists(email?: string, phone?: string): Promise<{ exists: boolean }> {
    const emailNorm = normalizeCandidateEmail(email);
    const phoneNorm = normalizeCandidatePhone(phone);

    if (!emailNorm && !phoneNorm) {
      return { exists: false };
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

    const query = `
      SELECT 1
      FROM ca_candidates
      WHERE is_deleted = false AND (${conditions.join(' OR ')})
      LIMIT 1
    `;

    const res = await this.pool.query(query, values);
    return { exists: (res.rowCount ?? 0) > 0 };
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
      INSERT INTO ca_duplicate_matches (
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
