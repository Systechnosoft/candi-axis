import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject } from '@nestjs/common';
import { QUEUE_NAMES } from '../queue.constants';
import { ParseResumeJobPayload } from '../queue.types';
import { DocumentsService } from '../../documents/documents.service';
import { ResumeAiParserService } from '../../ai/resume-ai-parser.service';
import { PdfLinkAnnotatorService } from '../../documents/parsing/pdf-link-annotator.service';
import { Pool } from 'pg';
import { PG_POOL } from '../../../infrastructure/database/database.module';
import { StorageService } from '../../storage/storage.service';

const pdfParse = require('pdf-parse');

@Processor(QUEUE_NAMES.RESUME_PARSING)
export class ResumeParsingProcessor extends WorkerHost {
  private readonly logger = new Logger(ResumeParsingProcessor.name);

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly parserService: ResumeAiParserService,
    private readonly pdfLinkAnnotator: PdfLinkAnnotatorService,
    private readonly storageService: StorageService,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {
    super();
  }

  async process(job: Job<ParseResumeJobPayload>) {
    const { documentId } = job.data;
    this.logger.log(
      `[ResumeParsingProcessor] Starting job ${job.id} for document ${documentId}`,
    );

    // Mark as processing
    await this.documentsService.updateParseStatus(documentId, 'processing');

    try {
      // 1. Fetch document metadata
      const doc = await this.documentsService.findOne(documentId);

      // 2. Download the file from storage
      const fileBuffer = await this.storageService.downloadObject(
        doc.storage_bucket,
        doc.storage_key,
      );

      // 3. Extract raw text from PDF/DOCX
      const rawText = await this.extractText(fileBuffer, doc.mime_type || '');
      if (!rawText || rawText.trim().length < 50) {
        throw new Error(
          'Could not extract meaningful text from the document. Ensure it is a valid non-scanned PDF or DOCX.',
        );
      }

      // 4. Extract hyperlink annotations from PDF (runs in parallel with AI call)
      let annotatedLinks: Array<{ type: string; url: string; label?: string }> =
        [];
      if ((doc.mime_type || '').toLowerCase().includes('pdf')) {
        try {
          const links = await this.pdfLinkAnnotator.extractLinks(fileBuffer);
          annotatedLinks = links.map((l) => ({
            type: l.type,
            url: l.url,
            label: l.label,
          }));
          this.logger.log(
            `[ResumeParsingProcessor] Extracted ${annotatedLinks.length} annotated links from PDF`,
          );
        } catch (linkErr: any) {
          this.logger.warn(
            `[ResumeParsingProcessor] Annotation extraction failed (non-fatal): ${linkErr.message}`,
          );
        }
      }

      // 5. Resolve which user uploaded this document so we can get their org's AI config
      const uploaderRes = await this.pool.query(
        `SELECT email FROM ca_users WHERE id = $1`,
        [doc.uploaded_by],
      );
      const uploaderEmail = uploaderRes.rows[0]?.email;
      if (!uploaderEmail) {
        throw new Error(
          `Cannot determine uploader's organization for document ${documentId}. AI config lookup failed.`,
        );
      }

      // 6. Call AI parser
      this.logger.log(
        `[ResumeParsingProcessor] Calling AI parser for document ${documentId} (org: ${uploaderEmail})`,
      );
      const parsed = await this.parserService.parseResumeText(
        rawText,
        uploaderEmail,
      );

      // 7. Merge annotated links into the parsed JSON so the frontend can access them
      //    Also normalise GitHub/LinkedIn URLs from annotated links if the AI missed them
      const enrichedParsed: Record<string, any> = { ...parsed };

      if (annotatedLinks.length > 0) {
        enrichedParsed.annotated_links = annotatedLinks;

        // Back-fill social URLs from annotations if AI left them empty
        for (const link of annotatedLinks) {
          if (link.type === 'linkedin' && !enrichedParsed.linkedin_url) {
            enrichedParsed.linkedin_url = link.url;
          } else if (link.type === 'github' && !enrichedParsed.github_url) {
            enrichedParsed.github_url = link.url;
          } else if (
            link.type === 'portfolio' &&
            !enrichedParsed.portfolio_url
          ) {
            enrichedParsed.portfolio_url = link.url;
          }
        }
      }

      // 8. Save results back to document (including raw text for audit)
      await this.documentsService.updateParseStatus(
        documentId,
        'completed',
        enrichedParsed,
        rawText.slice(0, 10000), // store first 10k chars of raw text in parsed_text column
        undefined,
        'ai_parser',
      );

      this.logger.log(
        `[ResumeParsingProcessor] Successfully parsed document ${documentId} ` +
          `(skills: ${(parsed.skills || []).length}, links: ${annotatedLinks.length})`,
      );
    } catch (error: any) {
      this.logger.error(
        `[ResumeParsingProcessor] Failed to parse document ${documentId}: ${error.message}`,
      );
      await this.documentsService.updateParseStatus(
        documentId,
        'failed',
        undefined,
        undefined,
        error.message,
      );
      // Do NOT rethrow — marking as failed is sufficient, no need to retry indefinitely
    }
  }

  private async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    const mime = mimeType.toLowerCase();
    if (mime.includes('pdf')) {
      try {
        const data = await pdfParse(buffer);
        return data.text || '';
      } catch (e: any) {
        throw new Error(`PDF text extraction failed: ${e.message}`);
      }
    }

    // For DOCX and other text-based formats
    try {
      const text = buffer.toString('utf8');
      // Strip binary noise — keep printable ASCII and common Unicode
      return text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
        .replace(/\s+/g, ' ');
    } catch {
      throw new Error(
        'Could not extract text from the uploaded file. Only PDF and text-based DOCX files are supported.',
      );
    }
  }
}
