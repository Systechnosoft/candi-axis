import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';
import { AuditService } from '../audit/audit.service';
import { CreateCandidateManualDto } from './dto/create-candidate-manual.dto';
import { CreateCandidateParsedDto } from './dto/create-candidate-parsed.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import {
  CandidateParserMappingService,
  MappedCandidatePayload,
} from './candidate-parser-mapping.service';
import { CandidateDuplicateService } from './candidate-duplicate.service';
import { DocumentsService } from '../documents/documents.service';
import { normalizeCandidateChildData } from './utils/parsed-candidate-normalizer';
import { calculateProfileScore, DEFAULT_WEIGHTS } from './utils/profile-scorer';

@Injectable()
export class CandidatesService {
  private readonly logger: Logger;

  constructor(
    @Inject(PG_POOL) private pool: Pool,
    private auditService: AuditService,
    private parserMappingService: CandidateParserMappingService,
    private duplicateService: CandidateDuplicateService,
    private documentsService: DocumentsService,
  ) {
    this.logger = new Logger(CandidatesService.name);
  }

  private cleanText(text: string): string {
    if (!text) return '';
    return text.trim().replace(/ +/g, ' ');
  }

  private normalizeEmail(email?: string): string | null {
    if (!email) return null;
    return email.trim().toLowerCase();
  }

  private normalizePhone(phone?: string): string | null {
    if (!phone) return null;
    return phone.replace(/[^0-9+]/g, '');
  }

  private normalizeCandidatePayload(data: any): any {
    const email = this.normalizeEmail(data.email);
    const phone = this.normalizePhone(data.phone);
    const firstName = data.first_name ? this.cleanText(data.first_name) : null;
    const lastName = data.last_name ? this.cleanText(data.last_name) : null;

    let fullName = this.cleanText(data.full_name);
    if (!fullName && (firstName || lastName)) {
      fullName = this.cleanText(`${firstName || ''} ${lastName || ''}`);
    }

    const socialLinks = (data.social_links || [])
      .map((link: any) => {
        const validTypes = [
          'linkedin',
          'github',
          'portfolio',
          'website',
          'other',
        ];
        let type = (link.link_type || '').toLowerCase();

        // If type is missing, invalid, or generic, try to infer from URL
        if (
          !validTypes.includes(type) ||
          type === 'other' ||
          type === 'website'
        ) {
          if (link.url?.includes('linkedin.com')) type = 'linkedin';
          else if (link.url?.includes('github.com')) type = 'github';
        }

        // Final fallback if still invalid
        if (!validTypes.includes(type)) type = 'other';

        let url = link.url ? link.url.trim() : '';
        if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
          url = `https://${url}`;
        }

        return {
          link_type: type,
          url: url,
          display_label: link.display_label || link.label || null,
          is_primary: !!link.is_primary,
        };
      })
      .filter((link: any) => link.url && link.link_type);

    let currentDesignation = data.current_designation
      ? this.cleanText(data.current_designation)
      : null;
    let currentCompany = data.current_company
      ? this.cleanText(data.current_company)
      : null;

    if (
      !currentDesignation &&
      data.employments &&
      data.employments.length > 0
    ) {
      // Find current or latest employment
      const latest =
        data.employments.find((e: any) => e.is_current) || data.employments[0];
      if (latest) {
        currentDesignation = this.cleanText(latest.job_title);
        currentCompany = this.cleanText(latest.company_name);
      }
    }

    return {
      ...data,
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      email: data.email ? data.email.trim() : null,
      email_normalized: email,
      secondary_email: data.secondary_email
        ? data.secondary_email.trim()
        : null,
      phone: data.phone ? data.phone.trim() : null,
      phone_normalized: phone,
      secondary_phone: data.secondary_phone
        ? data.secondary_phone.trim()
        : null,
      location: data.location ? this.cleanText(data.location) : null,
      current_designation: currentDesignation,
      current_company: currentCompany,
      total_exp_months:
        typeof data.total_exp_months === 'number'
          ? data.total_exp_months
          : data.total_exp_months
            ? parseInt(data.total_exp_months, 10)
            : null,
      relevant_exp_months:
        typeof data.relevant_exp_months === 'number'
          ? data.relevant_exp_months
          : data.relevant_exp_months
            ? parseInt(data.relevant_exp_months, 10)
            : null,
      notice_period_days:
        typeof data.notice_period_days === 'number'
          ? data.notice_period_days
          : data.notice_period_days
            ? parseInt(data.notice_period_days, 10)
            : null,
      current_ctc:
        typeof data.current_ctc === 'number'
          ? data.current_ctc
          : data.current_ctc
            ? parseFloat(data.current_ctc)
            : null,
      expected_ctc:
        typeof data.expected_ctc === 'number'
          ? data.expected_ctc
          : data.expected_ctc
            ? parseFloat(data.expected_ctc)
            : null,
      social_links: socialLinks,
    };
  }

  private async insertCandidateChildren(
    client: PoolClient,
    candidateId: string,
    userId: string,
    data: {
      educations?: any[];
      employments?: any[];
      certifications?: any[];
      social_links?: any[];
      projects?: any[];
    },
  ) {
    const normalized = normalizeCandidateChildData(data);

    const userRes = await client.query(
      `SELECT org_id FROM public.ca_users WHERE id = $1`,
      [userId],
    );
    let orgId = userRes.rows[0]?.org_id;
    if (!orgId) {
      const defaultOrgRes = await client.query(
        `SELECT id FROM public.ca_organisations ORDER BY created_at ASC LIMIT 1`,
      );
      orgId =
        defaultOrgRes.rows[0]?.id || '7af2ebf4-6888-4757-a585-bcd9115bb0da';
    }

    if (normalized.educations) {
      for (const [idx, ed] of normalized.educations.entries()) {
        await client.query(
          `INSERT INTO ca_candidate_educations 
           (org_id, candidate_id, qualification_level, degree, field_of_study, institution_name, start_year, end_year, grade_or_percentage, is_highest, sort_order, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            orgId,
            candidateId,
            ed.qualification_level || null,
            ed.degree || null,
            ed.field_of_study || null,
            ed.institution_name || null,
            ed.start_year || null,
            ed.end_year || null,
            ed.grade_or_percentage || null,
            ed.is_highest || false,
            idx,
            userId,
            userId,
          ],
        );
      }
    }

    if (normalized.employments) {
      for (const [idx, emp] of normalized.employments.entries()) {
        await client.query(
          `INSERT INTO ca_candidate_employments 
           (org_id, candidate_id, company_name, job_title, employment_type, location, start_date, end_date, is_current, responsibilities_summary, sort_order, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            orgId,
            candidateId,
            this.cleanText(emp.company_name),
            emp.job_title || null,
            emp.employment_type || null,
            emp.location || null,
            emp.start_date || null,
            emp.end_date || null,
            emp.is_current || false,
            emp.responsibilities_summary || null,
            idx,
            userId,
            userId,
          ],
        );
      }
    }

    if (normalized.certifications) {
      for (const [idx, cert] of normalized.certifications.entries()) {
        await client.query(
          `INSERT INTO ca_candidate_certifications 
           (org_id, candidate_id, certification_name, issuer, issued_on, expiry_on, does_not_expire, credential_id, credential_url, sort_order, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            orgId,
            candidateId,
            this.cleanText(cert.certification_name),
            cert.issuer || null,
            cert.issued_on || null,
            cert.expiry_on || null,
            cert.does_not_expire || false,
            cert.credential_id || null,
            cert.credential_url || null,
            idx,
            userId,
            userId,
          ],
        );
      }
    }

    if (normalized.social_links) {
      for (const [idx, link] of normalized.social_links.entries()) {
        if (!link.url || !link.link_type) continue;
        await client.query(
          `INSERT INTO ca_candidate_social_links 
           (org_id, candidate_id, link_type, url, display_label, is_primary, sort_order, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            orgId,
            candidateId,
            link.link_type,
            link.url,
            link.display_label || null,
            link.is_primary || false,
            idx,
            userId,
            userId,
          ],
        );
      }
    }

    if (normalized.projects) {
      for (const [idx, proj] of normalized.projects.entries()) {
        await client.query(
          `INSERT INTO ca_candidate_projects 
           (org_id, candidate_id, title, description, technologies, duration, role, project_url, sort_order, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            orgId,
            candidateId,
            this.cleanText(proj.title),
            proj.description || null,
            proj.technologies || null,
            proj.duration || null,
            proj.role || null,
            proj.project_url || null,
            idx,
            userId,
            userId,
          ],
        );
      }
    }
  }

  private async saveCandidateTags(
    client: PoolClient,
    candidateId: string,
    tags: string[] | undefined,
    userId: string,
    source: 'manual' | 'parser',
  ) {
    // Delete existing tags first to allow full synchronization (additions & removals)
    await client.query(
      `DELETE FROM ca_entity_tags WHERE entity_type = 'candidate' AND entity_id = $1`,
      [candidateId],
    );

    if (!tags || !Array.isArray(tags)) return;

    this.logger.log(
      `Saving ${tags.length} tags for candidate ${candidateId} (source: ${source})`,
    );

    const userRes = await client.query(
      `SELECT org_id FROM public.ca_users WHERE id = $1`,
      [userId],
    );
    let orgId = userRes.rows[0]?.org_id;
    if (!orgId) {
      const defaultOrgRes = await client.query(
        `SELECT id FROM public.ca_organisations ORDER BY created_at ASC LIMIT 1`,
      );
      orgId =
        defaultOrgRes.rows[0]?.id || '7af2ebf4-6888-4757-a585-bcd9115bb0da';
    }

    for (const tag of tags) {
      let cleanedName = tag.trim().replace(/\s+/g, ' ');
      if (!cleanedName) continue;

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(cleanedName)) {
        const existingTagRes = await client.query(
          `SELECT name FROM ca_tags WHERE id = $1`,
          [cleanedName],
        );
        if (existingTagRes.rows.length > 0) {
          cleanedName = existingTagRes.rows[0].name;
        } else {
          continue; // Skip if invalid UUID tag ID
        }
      }

      const normalizedName = cleanedName.toLowerCase();

      this.logger.log(`Checking tag in dictionary: "${cleanedName}"`);

      // Check/Insert tag in tags table
      const tagInsertResult = await client.query(
        `INSERT INTO ca_tags (org_id, name, normalized_name, type, created_by, updated_by)
         VALUES ($1, $2, $3, 'skill', $4, $4)
         ON CONFLICT (normalized_name, type) 
         DO UPDATE SET is_deleted = false, active = true, updated_at = now()
         RETURNING id`,
        [orgId, cleanedName, normalizedName, userId],
      );
      const tagId = tagInsertResult.rows[0].id;

      // Insert mapping in entity_tags table
      await client.query(
        `INSERT INTO ca_entity_tags (entity_type, entity_id, tag_id, source, confidence, created_by)
         VALUES ('candidate', $1, $2, $3, 1.0000, $4)
         ON CONFLICT (entity_type, entity_id, tag_id, source) DO NOTHING`,
        [candidateId, tagId, source, userId],
      );
    }
  }

  private async updateCandidateChildren(
    client: PoolClient,
    candidateId: string,
    userId: string,
    data: {
      educations?: any[];
      employments?: any[];
      certifications?: any[];
      social_links?: any[];
      projects?: any[];
    },
  ) {
    const normalized = normalizeCandidateChildData(data);

    if (normalized.educations) {
      await client.query(
        `UPDATE ca_candidate_educations SET is_highest = false WHERE candidate_id = $1`,
        [candidateId],
      );
      const incomingIds = normalized.educations
        .filter((e: any) => e.id)
        .map((e: any) => e.id);
      if (incomingIds.length > 0) {
        await client.query(
          `UPDATE ca_candidate_educations SET is_deleted = true, deleted_at = now() WHERE candidate_id = $1 AND id != ALL($2)`,
          [candidateId, incomingIds],
        );
      } else {
        await client.query(
          `UPDATE ca_candidate_educations SET is_deleted = true, deleted_at = now() WHERE candidate_id = $1`,
          [candidateId],
        );
      }
      for (const [idx, ed] of normalized.educations.entries()) {
        if (ed.id) {
          await client.query(
            `UPDATE ca_candidate_educations SET 
              qualification_level = $1, degree = $2, field_of_study = $3, institution_name = $4, 
              start_year = $5, end_year = $6, grade_or_percentage = $7, is_highest = $8, sort_order = $9, updated_by = $10 
             WHERE id = $11 AND candidate_id = $12`,
            [
              ed.qualification_level || null,
              ed.degree || null,
              ed.field_of_study || null,
              ed.institution_name || null,
              ed.start_year || null,
              ed.end_year || null,
              ed.grade_or_percentage || null,
              ed.is_highest || false,
              idx,
              userId,
              ed.id,
              candidateId,
            ],
          );
        } else {
          await client.query(
            `INSERT INTO ca_candidate_educations 
             (candidate_id, qualification_level, degree, field_of_study, institution_name, start_year, end_year, grade_or_percentage, is_highest, sort_order, created_by, updated_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              candidateId,
              ed.qualification_level || null,
              ed.degree || null,
              ed.field_of_study || null,
              ed.institution_name || null,
              ed.start_year || null,
              ed.end_year || null,
              ed.grade_or_percentage || null,
              ed.is_highest || false,
              idx,
              userId,
              userId,
            ],
          );
        }
      }
    }

    if (normalized.employments) {
      await client.query(
        `UPDATE ca_candidate_employments SET is_current = false WHERE candidate_id = $1`,
        [candidateId],
      );
      const incomingIds = normalized.employments
        .filter((e: any) => e.id)
        .map((e: any) => e.id);
      if (incomingIds.length > 0) {
        await client.query(
          `UPDATE ca_candidate_employments SET is_deleted = true, deleted_at = now() WHERE candidate_id = $1 AND id != ALL($2)`,
          [candidateId, incomingIds],
        );
      } else {
        await client.query(
          `UPDATE ca_candidate_employments SET is_deleted = true, deleted_at = now() WHERE candidate_id = $1`,
          [candidateId],
        );
      }
      for (const [idx, emp] of normalized.employments.entries()) {
        if (emp.id) {
          await client.query(
            `UPDATE ca_candidate_employments SET 
               company_name = $1, job_title = $2, employment_type = $3, location = $4, start_date = $5, 
               end_date = $6, is_current = $7, responsibilities_summary = $8, sort_order = $9, updated_by = $10
              WHERE id = $11 AND candidate_id = $12`,
            [
              this.cleanText(emp.company_name),
              emp.job_title || null,
              emp.employment_type || null,
              emp.location || null,
              emp.start_date || null,
              emp.end_date || null,
              emp.is_current || false,
              emp.responsibilities_summary || null,
              idx,
              userId,
              emp.id,
              candidateId,
            ],
          );
        } else {
          await client.query(
            `INSERT INTO ca_candidate_employments 
              (candidate_id, company_name, job_title, employment_type, location, start_date, end_date, is_current, responsibilities_summary, sort_order, created_by, updated_by)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              candidateId,
              this.cleanText(emp.company_name),
              emp.job_title || null,
              emp.employment_type || null,
              emp.location || null,
              emp.start_date || null,
              emp.end_date || null,
              emp.is_current || false,
              emp.responsibilities_summary || null,
              idx,
              userId,
              userId,
            ],
          );
        }
      }
    }

    if (data.certifications) {
      const incomingIds = data.certifications
        .filter((e) => e.id)
        .map((e) => e.id);
      if (incomingIds.length > 0) {
        await client.query(
          `UPDATE ca_candidate_certifications SET is_deleted = true, deleted_at = now() WHERE candidate_id = $1 AND id != ALL($2)`,
          [candidateId, incomingIds],
        );
      } else {
        await client.query(
          `UPDATE ca_candidate_certifications SET is_deleted = true, deleted_at = now() WHERE candidate_id = $1`,
          [candidateId],
        );
      }
      for (const [idx, cert] of data.certifications.entries()) {
        if (cert.id) {
          await client.query(
            `UPDATE ca_candidate_certifications SET 
              certification_name = $1, issuer = $2, issued_on = $3, expiry_on = $4, does_not_expire = $5, 
              credential_id = $6, credential_url = $7, sort_order = $8, updated_by = $9
             WHERE id = $10 AND candidate_id = $11`,
            [
              this.cleanText(cert.certification_name),
              cert.issuer || null,
              cert.issued_on || null,
              cert.expiry_on || null,
              cert.does_not_expire || false,
              cert.credential_id || null,
              cert.credential_url || null,
              idx,
              userId,
              cert.id,
              candidateId,
            ],
          );
        } else {
          await client.query(
            `INSERT INTO ca_candidate_certifications 
             (candidate_id, certification_name, issuer, issued_on, expiry_on, does_not_expire, credential_id, credential_url, sort_order, created_by, updated_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              candidateId,
              this.cleanText(cert.certification_name),
              cert.issuer || null,
              cert.issued_on || null,
              cert.expiry_on || null,
              cert.does_not_expire || false,
              cert.credential_id || null,
              cert.credential_url || null,
              idx,
              userId,
              userId,
            ],
          );
        }
      }
    }

    if (data.social_links) {
      await client.query(
        `UPDATE ca_candidate_social_links SET is_primary = false WHERE candidate_id = $1`,
        [candidateId],
      );
      const incomingIds = data.social_links
        .filter((e) => e.id)
        .map((e) => e.id);
      if (incomingIds.length > 0) {
        await client.query(
          `UPDATE ca_candidate_social_links SET is_deleted = true, deleted_at = now() WHERE candidate_id = $1 AND id != ALL($2)`,
          [candidateId, incomingIds],
        );
      } else {
        await client.query(
          `UPDATE ca_candidate_social_links SET is_deleted = true, deleted_at = now() WHERE candidate_id = $1`,
          [candidateId],
        );
      }
      for (const [idx, link] of data.social_links.entries()) {
        if (!link.url || !link.link_type) continue;
        if (link.id) {
          await client.query(
            `UPDATE ca_candidate_social_links SET 
              link_type = $1, url = $2, display_label = $3, is_primary = $4, sort_order = $5, updated_by = $6
             WHERE id = $7 AND candidate_id = $8`,
            [
              link.link_type,
              link.url,
              link.display_label || null,
              link.is_primary || false,
              idx,
              userId,
              link.id,
              candidateId,
            ],
          );
        } else {
          await client.query(
            `INSERT INTO ca_candidate_social_links 
             (candidate_id, link_type, url, display_label, is_primary, sort_order, created_by, updated_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              candidateId,
              link.link_type,
              link.url,
              link.display_label || null,
              link.is_primary || false,
              idx,
              userId,
              userId,
            ],
          );
        }
      }
    }

    if (data.projects) {
      const incomingIds = data.projects.filter((e) => e.id).map((e) => e.id);
      if (incomingIds.length > 0) {
        await client.query(
          `UPDATE ca_candidate_projects SET is_deleted = true, deleted_at = now() WHERE candidate_id = $1 AND id != ALL($2)`,
          [candidateId, incomingIds],
        );
      } else {
        await client.query(
          `UPDATE ca_candidate_projects SET is_deleted = true, deleted_at = now() WHERE candidate_id = $1`,
          [candidateId],
        );
      }
      for (const [idx, proj] of data.projects.entries()) {
        if (proj.id) {
          await client.query(
            `UPDATE ca_candidate_projects SET 
              title = $1, description = $2, technologies = $3, duration = $4, role = $5, 
              project_url = $6, sort_order = $7, updated_by = $8
             WHERE id = $9 AND candidate_id = $10`,
            [
              this.cleanText(proj.title),
              proj.description || null,
              proj.technologies || null,
              proj.duration || null,
              proj.role || null,
              proj.project_url || null,
              idx,
              userId,
              proj.id,
              candidateId,
            ],
          );
        } else {
          await client.query(
            `INSERT INTO ca_candidate_projects 
             (candidate_id, title, description, technologies, duration, role, project_url, sort_order, created_by, updated_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              candidateId,
              this.cleanText(proj.title),
              proj.description || null,
              proj.technologies || null,
              proj.duration || null,
              proj.role || null,
              proj.project_url || null,
              idx,
              userId,
              userId,
            ],
          );
        }
      }
    }
  }

  async createManual(
    userId: string,
    userEmail: string | undefined,
    dto: CreateCandidateManualDto,
  ) {
    const normalized = this.normalizeCandidatePayload(dto);

    if (!normalized.full_name) {
      throw new BadRequestException('Full name is required.');
    }
    if (!normalized.email_normalized && !normalized.phone_normalized) {
      throw new BadRequestException(
        'At least one contact method (email or phone) is required.',
      );
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const dupCheck = await this.duplicateService.detectDuplicates(
        normalized.email_normalized,
        normalized.phone_normalized,
        normalized.full_name,
      );

      if (dupCheck.hasHighMatch && !dto.force) {
        throw new ConflictException({
          message: 'A duplicate candidate with similar details already exists.',
          duplicates: dupCheck.matches.filter((m) => m.matchLevel === 'high'),
        });
      }

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

      const candQuery = `
        INSERT INTO ca_candidates (
          org_id,
          full_name, first_name, last_name, email, email_normalized,
          phone, phone_normalized, location, total_exp_months,
          relevant_exp_months, current_company, current_designation,
          notice_period_days, current_ctc, expected_ctc, profile_summary,
          source, status, created_by, updated_by, secondary_email, secondary_phone
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'active', $19, $19, $20, $21
        ) RETURNING *
      `;

      const candValues = [
        orgId,
        normalized.full_name,
        normalized.first_name,
        normalized.last_name,
        normalized.email,
        normalized.email_normalized,
        normalized.phone,
        normalized.phone_normalized,
        normalized.location,
        normalized.total_exp_months,
        normalized.relevant_exp_months,
        normalized.current_company,
        normalized.current_designation,
        normalized.notice_period_days,
        normalized.current_ctc,
        normalized.expected_ctc,
        normalized.profile_summary,
        normalized.source || 'manual',
        userId,
        normalized.secondary_email || null,
        normalized.secondary_phone || null,
      ];

      const res = await client.query(candQuery, candValues);
      const insertedCandidate = res.rows[0];

      await this.insertCandidateChildren(client, insertedCandidate.id, userId, {
        educations: normalized.educations,
        employments: normalized.employments,
        certifications: normalized.certifications,
        social_links: normalized.social_links,
        projects: normalized.projects,
      });

      await this.saveCandidateTags(
        client,
        insertedCandidate.id,
        dto.tags,
        userId,
        'manual',
      );

      if (dupCheck.matches.length > 0) {
        for (const match of dupCheck.matches) {
          await this.duplicateService.recordDuplicateMatch(
            insertedCandidate.id,
            match.candidateId,
            null,
            match.matchLevel,
            match.confidenceScore,
            match.signals,
            client,
          );
        }
      }

      await this.updateGapDetails(client, insertedCandidate.id);
      await this.updateCandidateProfileScore(
        client,
        insertedCandidate.id,
        userEmail,
      );

      await client.query('COMMIT');

      const populated = await this.findOne(insertedCandidate.id);

      await this.auditService.log({
        entityType: 'candidates',
        entityId: insertedCandidate.id,
        action: 'CREATE',
        beforeJson: null,
        afterJson: populated,
        changedBy: userId,
        reasonContext: 'Candidate created manually via API',
      });

      return populated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async createParsed(
    userId: string,
    userEmail: string | undefined,
    dto: CreateCandidateParsedDto,
  ) {
    const document = await this.documentsService.findOne(dto.document_id);

    await this.documentsService.updateParseStatus(
      document.id,
      'completed',
      dto.parsed_json,
    );

    const mapped = this.parserMappingService.mapParsedJson(dto.parsed_json);
    const candidateData = dto.candidate_data || mapped.candidate;

    // Merge mapped data with override data
    const mergedData = {
      ...candidateData,
      educations: dto.candidate_data?.educations || mapped.educations,
      employments: dto.candidate_data?.employments || mapped.employments,
      certifications:
        dto.candidate_data?.certifications || mapped.certifications,
      social_links: dto.candidate_data?.social_links || mapped.links,
      projects: dto.candidate_data?.projects || mapped.projects,
    };

    const normalized = this.normalizeCandidatePayload(mergedData);

    if (!normalized.full_name) {
      throw new BadRequestException(
        'Candidate name could not be resolved. Identity is required.',
      );
    }
    if (!normalized.email_normalized && !normalized.phone_normalized) {
      throw new BadRequestException(
        'At least one contact method (email or phone) is required.',
      );
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const dupCheck = await this.duplicateService.detectDuplicates(
        normalized.email_normalized,
        normalized.phone_normalized,
        normalized.full_name,
      );

      if (dupCheck.hasHighMatch && !dto.force) {
        throw new ConflictException({
          message: 'A duplicate candidate with similar details already exists.',
          duplicates: dupCheck.matches.filter((m) => m.matchLevel === 'high'),
        });
      }

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

      const candQuery = `
        INSERT INTO ca_candidates (
          org_id,
          full_name, first_name, last_name, email, email_normalized,
          phone, phone_normalized, location, total_exp_months,
          relevant_exp_months, current_company, current_designation,
          notice_period_days, current_ctc, expected_ctc, profile_summary,
          source, status, created_by, updated_by, secondary_email, secondary_phone
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'active', $19, $19, $20, $21
        ) RETURNING *
      `;

      const candValues = [
        orgId,
        normalized.full_name,
        normalized.first_name,
        normalized.last_name,
        normalized.email,
        normalized.email_normalized,
        normalized.phone,
        normalized.phone_normalized,
        normalized.location,
        normalized.total_exp_months,
        normalized.relevant_exp_months,
        normalized.current_company,
        normalized.current_designation,
        normalized.notice_period_days,
        normalized.current_ctc,
        normalized.expected_ctc,
        normalized.profile_summary,
        'resume_upload',
        userId,
        normalized.secondary_email || null,
        normalized.secondary_phone || null,
      ];

      const res = await client.query(candQuery, candValues);
      const insertedCandidate = res.rows[0];

      await this.insertCandidateChildren(client, insertedCandidate.id, userId, {
        educations: normalized.educations,
        employments: normalized.employments,
        certifications: normalized.certifications,
        social_links: normalized.social_links,
        projects: normalized.projects,
      });

      await this.documentsService.linkDocumentToCandidate(
        document.id,
        insertedCandidate.id,
        userId,
        client,
      );

      // Extract skills from parsed JSON and link them to the candidate
      const parsedSkills: any = dto.parsed_json?.skills;
      const skillsArray: string[] = Array.isArray(parsedSkills)
        ? parsedSkills.filter((s): s is string => typeof s === 'string')
        : [];

      const tagsToSave: string[] = [];
      if (dto.candidate_data?.tags && Array.isArray(dto.candidate_data.tags)) {
        tagsToSave.push(...dto.candidate_data.tags);
      }

      if (skillsArray.length > 0) {
        const normalizedSkills = skillsArray
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        if (normalizedSkills.length > 0) {
          const existingTagsRes = await client.query(
            `SELECT name, normalized_name FROM ca_tags WHERE normalized_name = ANY($1) AND is_deleted = false AND type = 'skill'`,
            [normalizedSkills],
          );
          const existingNormalizedNames = new Set(
            existingTagsRes.rows.map((row) => row.normalized_name),
          );

          for (const skill of skillsArray) {
            const norm = skill.trim().toLowerCase();
            if (norm && !existingNormalizedNames.has(norm)) {
              tagsToSave.push(skill);
            }
          }
        }
      }

      await this.saveCandidateTags(
        client,
        insertedCandidate.id,
        tagsToSave,
        userId,
        'parser',
      );

      if (dupCheck.matches.length > 0) {
        for (const match of dupCheck.matches) {
          await this.duplicateService.recordDuplicateMatch(
            insertedCandidate.id,
            match.candidateId,
            document.id,
            match.matchLevel,
            match.confidenceScore,
            match.signals,
            client,
          );
        }
      }

      await this.updateGapDetails(client, insertedCandidate.id);
      await this.updateCandidateProfileScore(
        client,
        insertedCandidate.id,
        userEmail,
      );

      await client.query('COMMIT');

      const populated = await this.findOne(insertedCandidate.id);

      await this.auditService.log({
        entityType: 'candidates',
        entityId: insertedCandidate.id,
        action: 'CREATE',
        beforeJson: null,
        afterJson: populated,
        changedBy: userId,
        reasonContext: 'Candidate created from parsed resume',
      });

      return populated;
    } catch (err) {
      if (client) {
        await client.query('ROLLBACK');
      }

      const docId = document?.id || dto.document_id;
      this.logger.error(
        `Failed to save candidate from parsed resume. Document ID: ${docId}. Error: ${err.message}`,
        err.stack,
      );

      throw err;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  private async handleDuplicateDetection(
    submissionRef: string | null,
    fullName: string,
    normEmail: string | null,
    normPhone: string | null,
  ) {
    const dupResult = await this.duplicateService.detectDuplicates(
      normEmail || undefined,
      normPhone || undefined,
      fullName,
    );

    if (dupResult.hasHighMatch || dupResult.hasMediumMatch) {
      for (const match of dupResult.matches) {
        await this.duplicateService.recordDuplicateMatch(
          null, // incoming_candidate_id pending
          match.candidateId,
          submissionRef,
          match.matchLevel,
          match.confidenceScore,
          match.signals,
        );
      }
    }

    if (dupResult.hasHighMatch) {
      throw new ConflictException({
        message: 'High confidence duplicate detected.',
        duplicates: dupResult.matches.filter((m) => m.matchLevel === 'high'),
      });
    }

    return { candidate: null, hasMediumMatch: dupResult.hasMediumMatch };
  }

  async findAll(page: number = 1, limit: number = 20, search?: string) {
    const offset = (page - 1) * limit;

    let baseQuery = `FROM ca_candidates c WHERE c.is_deleted = false`;
    const params: any[] = [];

    if (search && search.trim() !== '') {
      params.push(`%${search}%`);
      baseQuery += ` AND (c.full_name ILIKE $1 OR c.email ILIKE $1 OR c.phone ILIKE $1)`;
    }

    const countQuery = `SELECT count(*) as total ${baseQuery}`;
    const countRes = await this.pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0].total, 10);

    const dataQuery = `
      SELECT c.id, c.full_name, c.email, c.phone, c.location, c.total_exp_months, c.status, 
             c.source, c.current_company, c.current_designation, c.created_at, c.last_resume_uploaded_at, c.profile_score,
             c.updated_at, u.full_name as updated_by_name
      ${baseQuery}
      LEFT JOIN ca_users u ON c.updated_by = u.id
      ORDER BY c.updated_at DESC 
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const queryParams = [...params, limit, offset];
    const dataRes = await this.pool.query(dataQuery, queryParams);

    return {
      data: dataRes.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const res = await this.pool.query(
      `SELECT * FROM ca_candidates WHERE id = $1 AND is_deleted = false`,
      [id],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException('Candidate not found');
    }
    const candidate = res.rows[0];

    const educations = await this.pool.query(
      `SELECT * FROM ca_candidate_educations WHERE candidate_id = $1 AND is_deleted = false ORDER BY sort_order ASC, start_year DESC`,
      [id],
    );
    const employments = await this.pool.query(
      `SELECT * FROM ca_candidate_employments WHERE candidate_id = $1 AND is_deleted = false ORDER BY sort_order ASC, start_date DESC`,
      [id],
    );
    const certifications = await this.pool.query(
      `SELECT * FROM ca_candidate_certifications WHERE candidate_id = $1 AND is_deleted = false ORDER BY sort_order ASC`,
      [id],
    );
    const social_links = await this.pool.query(
      `SELECT * FROM ca_candidate_social_links WHERE candidate_id = $1 AND is_deleted = false ORDER BY sort_order ASC`,
      [id],
    );
    const projects = await this.pool.query(
      `SELECT * FROM ca_candidate_projects WHERE candidate_id = $1 AND is_deleted = false ORDER BY sort_order ASC`,
      [id],
    );

    const tags = await this.pool.query(
      `SELECT t.id, t.name, t.type
       FROM ca_entity_tags et
       JOIN ca_tags t ON et.tag_id = t.id
       WHERE et.entity_type = 'candidate' 
         AND et.entity_id = $1 
         AND t.is_deleted = false 
         AND t.active = true`,
      [id],
    );

    return {
      ...candidate,
      educations: educations.rows,
      employments: employments.rows,
      certifications: certifications.rows,
      social_links: social_links.rows,
      projects: projects.rows,
      tags: tags.rows,
    };
  }

  async update(
    id: string,
    userId: string,
    userEmail: string | undefined,
    dto: UpdateCandidateDto,
  ) {
    const current = await this.findOne(id);
    const normalized = this.normalizeCandidatePayload({ ...current, ...dto });

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const updateFields: string[] = [];
      const values: any[] = [];
      let counter = 1;

      const fieldsToUpdate = [
        { key: 'full_name', val: normalized.full_name },
        { key: 'first_name', val: normalized.first_name },
        { key: 'last_name', val: normalized.last_name },
        { key: 'email', val: normalized.email },
        { key: 'email_normalized', val: normalized.email_normalized },
        { key: 'secondary_email', val: normalized.secondary_email },
        { key: 'phone', val: normalized.phone },
        { key: 'phone_normalized', val: normalized.phone_normalized },
        { key: 'secondary_phone', val: normalized.secondary_phone },
        { key: 'location', val: normalized.location },
        { key: 'total_exp_months', val: normalized.total_exp_months },
        { key: 'relevant_exp_months', val: normalized.relevant_exp_months },
        { key: 'current_company', val: normalized.current_company },
        { key: 'current_designation', val: normalized.current_designation },
        { key: 'notice_period_days', val: normalized.notice_period_days },
        { key: 'current_ctc', val: normalized.current_ctc },
        { key: 'expected_ctc', val: normalized.expected_ctc },
        { key: 'profile_summary', val: normalized.profile_summary },
        { key: 'source', val: normalized.source },
        { key: 'gap_details', val: normalized.gap_details },
      ];

      for (const field of fieldsToUpdate) {
        if ((dto as any)[field.key] !== undefined) {
          updateFields.push(`${field.key} = $${counter++}`);
          values.push(field.val);
        }
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_by = $${counter++}`);
        values.push(userId);
        updateFields.push(`updated_at = now()`);

        values.push(id);
        const query = `UPDATE ca_candidates SET ${updateFields.join(', ')} WHERE id = $${counter} RETURNING *`;
        await client.query(query, values);
      }

      await this.updateCandidateChildren(client, id, userId, {
        educations: dto.educations,
        employments: dto.employments,
        certifications: dto.certifications,
        social_links: dto.social_links,
        projects: dto.projects,
      });

      if (dto.tags !== undefined) {
        await this.saveCandidateTags(client, id, dto.tags, userId, 'manual');
      }

      await this.updateGapDetails(client, id);
      await this.updateCandidateProfileScore(client, id, userEmail);

      await client.query('COMMIT');

      const updated = await this.findOne(id);
      await this.auditService.log({
        entityType: 'candidates',
        entityId: id,
        action: 'UPDATE',
        beforeJson: current,
        afterJson: updated,
        changedBy: userId,
        reasonContext: 'Candidate updated via API',
      });

      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private calculateGaps(educations: any[], employments: any[]): string | null {
    const gaps: string[] = [];

    const parseDate = (val: any): Date | null => {
      if (!val) return null;
      // Handle the case where val is a 4-digit year number (e.g., 2012)
      // new Date(2012) evaluates to 2012 milliseconds since 1970.
      if (typeof val === 'number' || /^\d{4}$/.test(String(val))) {
        const year = typeof val === 'number' ? val : parseInt(val, 10);
        return new Date(year, 0, 1);
      }
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    const parseYear = (val: any): number => {
      if (!val) return NaN;
      if (typeof val === 'number') return val;
      const match = String(val).match(/\d{4}/);
      return match ? parseInt(match[0], 10) : NaN;
    };

    const parseEducationEndDate = (val: any): Date | null => {
      if (!val) return null;
      // If it's a pure number/year string, create a June 30th date
      if (typeof val === 'number' || /^\d{4}$/.test(String(val))) {
        const year = typeof val === 'number' ? val : parseInt(val, 10);
        return new Date(year, 5, 30); // June 30th of that year
      }
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d;
      const year = parseYear(val);
      if (!isNaN(year)) {
        return new Date(year, 5, 30); // June 30th of that year
      }
      return null;
    };

    // 1. Experience Gaps between consecutive employments
    let validEmps: any[] = [];
    if (employments && employments.length > 0) {
      validEmps = employments
        .filter((e) => e.start_date)
        .map((e) => ({
          ...e,
          startDateObj: parseDate(e.start_date),
          endDateObj: e.end_date ? parseDate(e.end_date) : null,
        }))
        .filter((e) => e.startDateObj !== null)
        .sort((a, b) => a.startDateObj!.getTime() - b.startDateObj!.getTime());

      for (let i = 1; i < validEmps.length; i++) {
        const prev = validEmps[i - 1];
        const curr = validEmps[i];

        if (prev.is_current || !prev.end_date || !prev.endDateObj) {
          continue;
        }

        const prevEnd = prev.endDateObj;
        const currStart = curr.startDateObj!;

        if (currStart > prevEnd) {
          // Calculate calendar month difference
          // Formula: (Year2 - Year1) * 12 + (Month2 - Month1) - 1
          // The -1 accounts for the fact that if you end in Oct and start in Dec, the gap is only Nov (1 month).
          const diffMonths = (currStart.getFullYear() - prevEnd.getFullYear()) * 12 
                           + (currStart.getMonth() - prevEnd.getMonth()) - 1;

          if (diffMonths > 0) {
            const prevDateStr = prevEnd.toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            });
            const currDateStr = currStart.toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            });
            
            // Only report if it's 2 or more months gap, or if you want to report 1 month gaps.
            // Let's report gaps >= 1 month if they want to see any gap. 
            // The previous logic reported diffMonths >= 2 (which was actually a 1 month calendar gap).
            // So diffMonths >= 1 is equivalent to the old diffMonths >= 2.
            if (diffMonths >= 1) {
              gaps.push(
                `Experience gap of ${diffMonths} month${diffMonths > 1 ? 's' : ''} between ${prev.company_name} (ended ${prevDateStr}) and ${curr.company_name} (started ${currDateStr})`,
              );
            }
          }
        }
      }
    }

    // 2. Check if there is a gap between the latest employment's end date and today (if not currently employed)
    if (validEmps.length > 0) {
      const latestEmp = validEmps[validEmps.length - 1];
      const hasCurrentEmp = validEmps.some((e) => e.is_current);

      if (
        latestEmp &&
        !hasCurrentEmp &&
        latestEmp.end_date &&
        latestEmp.endDateObj
      ) {
        const today = new Date();
        const prevEnd = latestEmp.endDateObj;
        if (today > prevEnd) {
          const diffMonths = (today.getFullYear() - prevEnd.getFullYear()) * 12 
                           + (today.getMonth() - prevEnd.getMonth()) - 1;

          if (diffMonths >= 1) {
            const prevDateStr = prevEnd.toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            });
            const yrs = Math.floor(diffMonths / 12);
            const mths = diffMonths % 12;
            const durationStr =
              yrs > 0
                ? `${yrs} year${yrs > 1 ? 's' : ''}${mths > 0 ? ` and ${mths} month${mths > 1 ? 's' : ''}` : ''}`
                : `${diffMonths} month${diffMonths > 1 ? 's' : ''}`;
            gaps.push(
              `Experience gap of ${durationStr} since last employment ended at ${latestEmp.company_name} (${prevDateStr})`,
            );
          }
        }
      }
    }

    // 3. Education Gaps between consecutive educations
    let validEds: any[] = [];
    if (educations && educations.length > 0) {
      validEds = educations
        .filter((e) => e.start_year && e.end_year)
        .map((e) => ({
          ...e,
          startYearInt: parseYear(e.start_year),
          endYearInt: parseYear(e.end_year),
          endDateObj: parseEducationEndDate(e.end_year),
        }))
        .filter((e) => !isNaN(e.startYearInt) && !isNaN(e.endYearInt))
        .sort((a, b) => a.startYearInt - b.startYearInt);

      for (let i = 1; i < validEds.length; i++) {
        const prev = validEds[i - 1];
        const curr = validEds[i];

        const prevEnd = prev.endYearInt;
        const currStart = curr.startYearInt;

        if (currStart > prevEnd) {
          const diffYears = currStart - prevEnd;
          if (diffYears >= 1) {
            gaps.push(
              `Education gap of ${diffYears} year(s) between ${prev.institution_name} (ended ${prevEnd}) and ${curr.institution_name} (started ${currStart})`,
            );
          }
        }
      }
    }

    // 4. Check for gap between latest education and first employment
    if (validEds.length > 0 && validEmps.length > 0) {
      // Sort valid education by end date to find latest education
      const sortedEdsByEnd = [...validEds]
        .filter((e) => e.endDateObj !== null)
        .sort((a, b) => a.endDateObj.getTime() - b.endDateObj.getTime());

      const latestEd = sortedEdsByEnd[sortedEdsByEnd.length - 1];
      const firstEmp = validEmps[0];

      if (latestEd && firstEmp && firstEmp.startDateObj) {
        const edEnd = latestEd.endDateObj!;
        const empStart = firstEmp.startDateObj;

        if (empStart > edEnd) {
          const diffMonths = (empStart.getFullYear() - edEnd.getFullYear()) * 12 
                           + (empStart.getMonth() - edEnd.getMonth()) - 1;

          if (diffMonths >= 6) {
            // Only report if the gap is at least 6 months
            const edEndStr = latestEd.end_year;
            const empStartStr = firstEmp.startDateObj.toLocaleDateString(
              'en-US',
              { month: 'short', year: 'numeric' },
            );
            gaps.push(
              `Gap of ${diffMonths} months between completing education at ${latestEd.institution_name} (${edEndStr}) and starting first job at ${firstEmp.company_name} (${empStartStr})`,
            );
          }
        }
      }
    }

    return gaps.length > 0 ? gaps.join('; ') : null;
  }

  private async updateGapDetails(client: PoolClient, candidateId: string) {
    const educations = await client.query(
      `SELECT * FROM ca_candidate_educations WHERE candidate_id = $1 AND is_deleted = false ORDER BY start_year ASC`,
      [candidateId],
    );
    const employments = await client.query(
      `SELECT * FROM ca_candidate_employments WHERE candidate_id = $1 AND is_deleted = false ORDER BY start_date ASC`,
      [candidateId],
    );

    const gapDetails = this.calculateGaps(educations.rows, employments.rows);

    await client.query(
      `UPDATE ca_candidates SET gap_details = $1, updated_at = now() WHERE id = $2`,
      [gapDetails ? JSON.stringify(gapDetails) : null, candidateId],
    );
  }

  private getOrgPrefix(email: string): string {
    if (!email) return 'org:default:';
    const parts = email.split('@');
    const domain = parts.length > 1 ? parts[1].toLowerCase() : 'default';
    return `org:${domain}:`;
  }

  async updateCandidateProfileScore(
    client: Pool | PoolClient,
    candidateId: string,
    email?: string,
    weights?: any,
  ) {
    let resolvedEmail = email;
    if (!resolvedEmail) {
      const creatorRes = await client.query(
        `SELECT u.email FROM ca_candidates c JOIN ca_users u ON c.created_by = u.id WHERE c.id = $1`,
        [candidateId],
      );
      if (creatorRes.rows.length > 0) {
        resolvedEmail = creatorRes.rows[0].email;
      }
    }

    let activeWeights = weights;
    if (!activeWeights && resolvedEmail) {
      const orgPrefix = this.getOrgPrefix(resolvedEmail);
      const keyName = `${orgPrefix}resume_scoring_weights`;
      const res = await client.query(
        'SELECT setting_value FROM ca_admin_settings WHERE setting_key = $1 AND is_active = true',
        [keyName],
      );
      if (res.rows.length > 0) {
        activeWeights = res.rows[0].setting_value;
      }
    }

    if (!activeWeights) {
      activeWeights = DEFAULT_WEIGHTS;
    }

    const candRes = await client.query(
      'SELECT * FROM ca_candidates WHERE id = $1',
      [candidateId],
    );
    if (candRes.rows.length === 0) return;
    const candidate = candRes.rows[0];

    const educations = await client.query(
      `SELECT * FROM ca_candidate_educations WHERE candidate_id = $1 AND is_deleted = false`,
      [candidateId],
    );
    const employments = await client.query(
      `SELECT * FROM ca_candidate_employments WHERE candidate_id = $1 AND is_deleted = false`,
      [candidateId],
    );
    const certifications = await client.query(
      `SELECT * FROM ca_candidate_certifications WHERE candidate_id = $1 AND is_deleted = false`,
      [candidateId],
    );
    const social_links = await client.query(
      `SELECT * FROM ca_candidate_social_links WHERE candidate_id = $1 AND is_deleted = false`,
      [candidateId],
    );
    const projects = await client.query(
      `SELECT * FROM ca_candidate_projects WHERE candidate_id = $1 AND is_deleted = false`,
      [candidateId],
    );
    const tags = await client.query(
      `SELECT t.id, t.name, t.type
       FROM ca_entity_tags et
       JOIN ca_tags t ON et.tag_id = t.id
       WHERE et.entity_type = 'candidate' 
         AND et.entity_id = $1 
         AND t.is_deleted = false 
         AND t.active = true`,
      [candidateId],
    );

    const score = calculateProfileScore(
      candidate,
      educations.rows,
      employments.rows,
      certifications.rows,
      social_links.rows,
      projects.rows,
      tags.rows,
      activeWeights,
    );

    await client.query(
      `UPDATE ca_candidates SET profile_score = $1 WHERE id = $2`,
      [Math.round(Number(score) || 0), candidateId],
    );
    return score;
  }

  async recalculateScoresForDomain(domain: string, weights: any) {
    const query = `
      SELECT c.id 
      FROM ca_candidates c 
      JOIN ca_users u ON c.created_by = u.id 
      WHERE u.email_normalized LIKE $1 AND c.is_deleted = false
    `;
    const res = await this.pool.query(query, [`%@${domain}`]);
    const candidateIds = res.rows.map((row) => row.id);
    for (const id of candidateIds) {
      await this.updateCandidateProfileScore(this.pool, id, undefined, weights);
    }
  }
}
