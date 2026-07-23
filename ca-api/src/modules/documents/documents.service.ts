import {
  Injectable,
  Inject, forwardRef,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';
import { AuditService } from '../audit/audit.service';
import { RegisterDocumentDto } from './dto/register-document.dto';
import { StorageService } from '../storage/storage.service';
import { QueueService } from '../queue/queue.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { ParseResumeJobPayload } from '../queue/queue.types';

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(PG_POOL) private pool: Pool,
    private auditService: AuditService,
    private storageService: StorageService,
    @Inject(forwardRef(() => QueueService))
    private queueService: QueueService,
  ) {}

  async registerUnattachedResume(userId: string, dto: RegisterDocumentDto) {
    const userRes = await this.pool.query(
      `SELECT org_id FROM public.users WHERE id = $1`,
      [userId]
    );
    let orgId = userRes.rows[0]?.org_id;
    if (!orgId) {
      const defaultOrgRes = await this.pool.query(
        `SELECT id FROM public.organisations ORDER BY created_at ASC LIMIT 1`
      );
      orgId = defaultOrgRes.rows[0]?.id || '7af2ebf4-6888-4757-a585-bcd9115bb0da';
    }

    const query = `
      INSERT INTO documents (
        org_id,
        entity_type, 
        entity_id, 
        document_type, 
        original_file_name, 
        storage_bucket, 
        storage_key, 
        mime_type, 
        file_size_bytes, 
        file_hash, 
        parse_status,
        uploaded_by
      ) VALUES (
        $1,
        'unattached_resume',
        gen_random_uuid(),
        $2, $3, $4, $5, $6, $7, $8,
        'pending',
        $9
      ) RETURNING *
    `;

    const values = [
      orgId,
      dto.document_type,
      dto.original_file_name,
      dto.storage_bucket,
      dto.storage_key,
      dto.mime_type,
      dto.file_size_bytes || null,
      dto.file_hash || null,
      userId,
    ];

    try {
      const res = await this.pool.query(query, values);
      const document = res.rows[0];

      await this.auditService.log({
        entityType: 'documents',
        entityId: document.id,
        action: 'CREATE',
        afterJson: document,
        changedBy: userId,
        reasonContext: 'Unattached resume registered',
      });

      return document;
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException(
          'A document with this storage key already exists.',
        );
      }
      throw error;
    }
  }

  async updateParseStatus(
    id: string,
    status: string,
    parsedJson?: any,
    parsedText?: string,
    errorMsg?: string,
    vendor?: string,
  ) {
    const allowedStatuses = [
      'pending',
      'processing',
      'completed',
      'failed',
      'skipped',
    ];
    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException('Invalid parse status');
    }

    const currentRes = await this.pool.query(
      `SELECT * FROM documents WHERE id = $1 AND is_deleted = false`,
      [id],
    );
    if (currentRes.rows.length === 0) {
      throw new NotFoundException('Document not found');
    }
    const currentDoc = currentRes.rows[0];

    const query = `
      UPDATE documents
      SET parse_status = $1::varchar,
          parsed_json = COALESCE($2::jsonb, parsed_json),
          parsed_text = COALESCE($3, parsed_text),
          parse_error = COALESCE($4, parse_error),
          parser_vendor = COALESCE($5, parser_vendor),
          parsed_at = CASE WHEN $1::varchar = 'completed' THEN now() ELSE parsed_at END,
          updated_at = now()
      WHERE id = $6
      RETURNING *
    `;

    const values = [
      status,
      parsedJson ? JSON.stringify(parsedJson) : null,
      parsedText || null,
      errorMsg || null,
      vendor || null,
      id,
    ];

    const res = await this.pool.query(query, values);
    const updatedDoc = res.rows[0];

    await this.auditService.log({
      entityType: 'documents',
      entityId: id,
      action: 'UPDATE',
      beforeJson: currentDoc,
      afterJson: updatedDoc,
      changedBy: currentDoc.uploaded_by,
      reasonContext: `Parse status updated to ${status}`,
    });

    return updatedDoc;
  }

  async linkDocumentToCandidate(
    documentId: string,
    candidateId: string,
    userId: string,
    client?: any,
  ) {
    const dbClient = client || this.pool;

    const query = `
      UPDATE documents 
      SET entity_type = 'candidate',
          entity_id = $1,
          is_primary = true,
          updated_at = now()
      WHERE id = $2 AND is_deleted = false
      RETURNING *
    `;

    const res = await dbClient.query(query, [candidateId, documentId]);
    if (res.rows.length === 0) {
      throw new NotFoundException('Document not found or already deleted');
    }

    const updatedDoc = res.rows[0];

    // We pass dbClient but since Audit logging is async and uses pool natively,
    // we just let it use the standard pool. It won't be strictly in the same transaction for audit,
    // which is fine for Phase 1.

    return updatedDoc;
  }

  async findOne(id: string) {
    const res = await this.pool.query(
      `SELECT * FROM documents WHERE id = $1 AND is_deleted = false`,
      [id],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException('Document not found');
    }
    return res.rows[0];
  }

  async findPrimaryResumeForCandidate(candidateId: string) {
    const res = await this.pool.query(
      `SELECT id, original_file_name, mime_type, storage_bucket, storage_key 
       FROM documents 
       WHERE entity_type = 'candidate' AND entity_id = $1 AND is_primary = true AND is_deleted = false`,
      [candidateId]
    );
    if (res.rows.length === 0) {
      return null;
    }
    return res.rows[0];
  }

  async downloadFile(bucket: string, key: string) {
    return this.storageService.downloadObject(bucket, key);
  }

 async uploadResume(
    userId: string,
    file: Express.Multer.File,
  ) {
    const upload = await this.storageService.uploadResume(file);

    const document = await this.registerUnattachedResume(userId, {
      document_type: 'resume',
      original_file_name: file.originalname,
      storage_bucket: upload.bucket,
      storage_key: upload.objectName,
      mime_type: file.mimetype,
      file_size_bytes: file.size,
    });

    await this.queueService.enqueue<ParseResumeJobPayload>(
      QUEUE_NAMES.RESUME_PARSING,
      'parse-resume',
      {
        documentId: document.id,
        candidateId: document.entity_id,
      },
    );

    return document;
  }
}
