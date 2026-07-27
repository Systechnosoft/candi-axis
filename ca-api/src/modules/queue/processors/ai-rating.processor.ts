import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject, NotFoundException } from '@nestjs/common';
import { QUEUE_NAMES } from '../queue.constants';
import { AiRatingJobPayload } from '../queue.types';
import { Pool } from 'pg';
import { PG_POOL } from '../../../infrastructure/database/database.module';
import { ApplicationAiRatingService } from '../../ai/application-ai-rating.service';

@Processor(QUEUE_NAMES.AI_RATING)
export class AiRatingProcessor extends WorkerHost {
  private readonly logger = new Logger(AiRatingProcessor.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly aiRatingService: ApplicationAiRatingService,
  ) {
    super();
  }

  async process(job: Job<AiRatingJobPayload>) {
    const { applicationId, candidateId, jdId } = job.data;
    this.logger.log(
      `Starting processing for job [${job.id}] in queue [${QUEUE_NAMES.AI_RATING}] for application [${applicationId}]`,
    );

    try {
      // 1. Fetch application details
      const appQuery = `
        SELECT a.*, u.email as creator_email
        FROM applications a
        LEFT JOIN ca_users u ON a.created_by = u.id
        WHERE a.id = $1 AND a.is_deleted = false
      `;
      const appRes = await this.pool.query(appQuery, [applicationId]);
      if (appRes.rows.length === 0) {
        throw new NotFoundException(`Application ${applicationId} not found`);
      }
      const application = appRes.rows[0];
      const email = application.creator_email || 'admin@systechnosoft.com';

      // 2. Fetch candidate details
      const candidateQuery = `
        SELECT * FROM ca_candidates WHERE id = $1 AND is_deleted = false
      `;
      const candidateRes = await this.pool.query(candidateQuery, [candidateId]);
      if (candidateRes.rows.length === 0) {
        throw new NotFoundException(`Candidate ${candidateId} not found`);
      }
      const candidate = candidateRes.rows[0];

      // Fetch educations and employments for candidate
      const educationsRes = await this.pool.query(
        'SELECT * FROM ca_candidate_educations WHERE candidate_id = $1 AND is_deleted = false',
        [candidateId],
      );
      const employmentsRes = await this.pool.query(
        'SELECT * FROM ca_candidate_employments WHERE candidate_id = $1 AND is_deleted = false',
        [candidateId],
      );
      candidate.educations = educationsRes.rows;
      candidate.employments = employmentsRes.rows;

      // 3. Fetch Job Description details
      const jdQuery = `
        SELECT * FROM ca_job_descriptions WHERE id = $1 AND is_deleted = false
      `;
      const jdRes = await this.pool.query(jdQuery, [jdId]);
      if (jdRes.rows.length === 0) {
        throw new NotFoundException(`Job description ${jdId} not found`);
      }
      const jd = jdRes.rows[0];

      // 4. Determine latest version and rating entry id
      const latestRatingRes = await this.pool.query(
        'SELECT id, version FROM ai_ratings WHERE application_id = $1 ORDER BY version DESC LIMIT 1',
        [applicationId],
      );
      const version = latestRatingRes.rows[0]
        ? latestRatingRes.rows[0].version
        : 1;

      // 5. Try calling AI Rating Service
      let ratingResult: any = null;
      const status = 'completed';
      const errorMessage: string | null = null;

      try {
        ratingResult = await this.aiRatingService.rateApplication(
          candidate,
          jd,
          email,
        );
      } catch (aiError: any) {
        this.logger.warn(
          `AI rating failed for application ${applicationId}: ${aiError.message}. Falling back to common tags based calculation.`,
        );

        // Tag-based fallback calculation
        const candTagsRes = await this.pool.query(
          `SELECT t.name 
           FROM ca_entity_tags et 
           JOIN ca_tags t ON et.tag_id = t.id 
           WHERE et.entity_type = 'candidate' AND et.entity_id = $1`,
          [candidateId],
        );
        const jdTagsRes = await this.pool.query(
          `SELECT t.name 
           FROM ca_entity_tags et 
           JOIN ca_tags t ON et.tag_id = t.id 
           WHERE et.entity_type = 'job_description' AND et.entity_id = $1`,
          [jdId],
        );

        const candidateTags = candTagsRes.rows.map((r: any) =>
          r.name.toLowerCase(),
        );
        const jdTags = jdTagsRes.rows.map((r: any) => r.name.toLowerCase());

        const matchedTags = jdTags.filter((tag: string) =>
          candidateTags.includes(tag),
        );
        const missingTags = jdTags.filter(
          (tag: string) => !candidateTags.includes(tag),
        );

        let overallScore = 0;
        let skillsAnalyzed: any[] = [];

        if (jdTags.length > 0) {
          overallScore = (matchedTags.length / jdTags.length) * 10; // scale 0-10
          skillsAnalyzed = jdTags.map((tag: string) => ({
            skill: tag,
            rating: candidateTags.includes(tag) ? 8.0 : 2.0,
            evidence: candidateTags.includes(tag)
              ? `Found matching tag "${tag}" in candidate profile skills/tags.`
              : `Skill "${tag}" is in Job Description but not matched in candidate tags.`,
            confidence: 0.9,
          }));
        } else if (candidateTags.length > 0) {
          overallScore = 7.5;
          skillsAnalyzed = candidateTags.slice(0, 5).map((tag: string) => ({
            skill: tag,
            rating: 7.5,
            evidence: `Candidate has tag "${tag}". Job Description has no specific skills listed.`,
            confidence: 0.85,
          }));
        } else {
          overallScore = 5.0;
          skillsAnalyzed = [
            {
              skill: 'General Fit',
              rating: 5.0,
              evidence:
                'No specific matching tags found in Job Description or Candidate.',
              confidence: 0.7,
            },
          ];
        }

        ratingResult = {
          overall_resume_score: overallScore,
          skills_analyzed: skillsAnalyzed,
          missing_critical_skills: missingTags,
          notes:
            'Computed using tag intersection due to AI engine fallback mode.',
        };
      }

      // 6. Save back to the database
      const dbScore = Math.round(ratingResult.overall_resume_score * 10);

      const updateQuery = `
        UPDATE ai_ratings 
        SET score = $1, 
            confidence = $2, 
            rationale_bullets = $3, 
            matched_keywords = $4, 
            missing_gaps = $5, 
            status = $6, 
            error_message = $7,
            refreshed_at = now()
        WHERE application_id = $8 AND version = $9
      `;

      const matchedKeywords = ratingResult.skills_analyzed
        .filter((s: any) => s.rating >= 6)
        .map((s: any) => s.skill);

      await this.pool.query(updateQuery, [
        dbScore,
        0.9, // default confidence
        JSON.stringify(ratingResult.skills_analyzed), // stored in rationale_bullets for UI retrieval
        JSON.stringify(matchedKeywords),
        JSON.stringify(ratingResult.missing_critical_skills),
        status,
        errorMessage,
        applicationId,
        version,
      ]);

      this.logger.log(
        `Successfully completed AI rating for application ${applicationId}. Score: ${dbScore}%`,
      );
    } catch (error: any) {
      this.logger.error(`Error processing job [${job.id}]:`, error);

      try {
        await this.pool.query(
          `UPDATE ai_ratings 
           SET status = 'failed', error_message = $1, refreshed_at = now() 
           WHERE application_id = $2`,
          [error.message, applicationId],
        );
      } catch (dbErr) {
        this.logger.error(`Failed to update job status to failed:`, dbErr);
      }

      throw error;
    }
  }
}
