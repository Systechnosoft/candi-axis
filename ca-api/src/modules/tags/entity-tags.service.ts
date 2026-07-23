import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';
import { AssignEntityTagDto } from './dto/assign-entity-tag.dto';
import { ReplaceEntityTagsDto } from './dto/replace-entity-tags.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class EntityTagsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly auditService: AuditService,
  ) {}

  private validateEntityType(entityType: string) {
    if (entityType !== 'job_description' && entityType !== 'candidate') {
      throw new BadRequestException(
        `Invalid entityType. Must be 'job_description' or 'candidate'.`,
      );
    }
  }

  async getEntityTags(entityType: string, entityId: string) {
    this.validateEntityType(entityType);

    const result = await this.pool.query(
      `SELECT et.id, et.entity_type, et.entity_id, et.tag_id, et.source, et.confidence, et.created_at, et.is_starred,
              t.name as tag_name, t.type as tag_type, t.normalized_name 
       FROM entity_tags et
       JOIN tags t ON t.id = et.tag_id
       WHERE et.entity_type = $1 AND et.entity_id = $2
       ORDER BY t.name ASC`,
      [entityType, entityId],
    );

    return result.rows;
  }

  async assignTag(
    entityType: string,
    entityId: string,
    userId: string,
    assignDto: AssignEntityTagDto,
  ) {
    this.validateEntityType(entityType);

    const tagResult = await this.pool.query(
      `SELECT id FROM tags WHERE id = $1 AND active = true AND is_deleted = false`,
      [assignDto.tagId],
    );
    if (tagResult.rows.length === 0) {
      throw new NotFoundException(
        `Tag with ID ${assignDto.tagId} not found or inactive.`,
      );
    }

    const source = assignDto.source || 'manual';
    const confidence = assignDto.confidence ?? null;
    const isStarred = assignDto.is_starred ?? false;

    try {
      const result = await this.pool.query(
        `INSERT INTO entity_tags (entity_type, entity_id, tag_id, source, confidence, created_by, is_starred) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [entityType, entityId, assignDto.tagId, source, confidence, userId, isStarred],
      );

      const newAssignment = result.rows[0];

      await this.auditService.log({
        entityType: 'entity_tags',
        entityId: newAssignment.id,
        action: 'CREATE',
        beforeJson: null,
        afterJson: newAssignment,
        changedBy: userId,
        reasonContext: `Assigned tag ${assignDto.tagId} to ${entityType} ${entityId}`,
      });

      return newAssignment;
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException(
          `Tag is already assigned to this entity with this source.`,
        );
      }
      throw error;
    }
  }

  async removeTag(
    entityType: string,
    entityId: string,
    tagId: string,
    userId: string,
  ) {
    this.validateEntityType(entityType);

    const currentResult = await this.pool.query(
      `SELECT * FROM entity_tags WHERE entity_type = $1 AND entity_id = $2 AND tag_id = $3`,
      [entityType, entityId, tagId],
    );

    if (currentResult.rows.length === 0) {
      throw new NotFoundException(
        `Tag ${tagId} is not assigned to ${entityType} ${entityId}.`,
      );
    }

    const currentAssignment = currentResult.rows[0];

    await this.pool.query(`DELETE FROM entity_tags WHERE id = $1`, [
      currentAssignment.id,
    ]);

    await this.auditService.log({
      entityType: 'entity_tags',
      entityId: currentAssignment.id,
      action: 'DELETE',
      beforeJson: currentAssignment,
      afterJson: null,
      changedBy: userId,
      reasonContext: `Removed tag ${tagId} from ${entityType} ${entityId}`,
    });

    return { message: 'Tag assignment removed successfully.' };
  }

  async replaceTags(
    entityType: string,
    entityId: string,
    userId: string,
    replaceDto: ReplaceEntityTagsDto,
  ) {
    this.validateEntityType(entityType);

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const currentResult = await client.query(
        `SELECT * FROM entity_tags WHERE entity_type = $1 AND entity_id = $2`,
        [entityType, entityId],
      );
      const currentTags = currentResult.rows;

      await client.query(
        `DELETE FROM entity_tags WHERE entity_type = $1 AND entity_id = $2`,
        [entityType, entityId],
      );

      const newAssignments = [];
      for (const tag of replaceDto.tags) {
        const source = tag.source || 'manual';
        const confidence = tag.confidence ?? null;
        const isStarred = tag.is_starred ?? false;

        const insertResult = await client.query(
          `INSERT INTO entity_tags (entity_type, entity_id, tag_id, source, confidence, created_by, is_starred) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) 
           ON CONFLICT (entity_type, entity_id, tag_id, source) DO UPDATE SET is_starred = EXCLUDED.is_starred
           RETURNING *`,
          [entityType, entityId, tag.tagId, source, confidence, userId, isStarred],
        );

        if (insertResult.rows.length > 0) {
          newAssignments.push(insertResult.rows[0]);
        }
      }

      await client.query('COMMIT');

      await this.auditService.log({
        entityType: 'entity_tags',
        entityId: entityId,
        action: 'UPDATE',
        beforeJson: { tags: currentTags },
        afterJson: { tags: newAssignments },
        changedBy: userId,
        reasonContext: `Replaced all tags for ${entityType} ${entityId}`,
      });

      return newAssignments;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
