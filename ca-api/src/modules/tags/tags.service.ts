import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TagsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly auditService: AuditService,
  ) {}

  private cleanText(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
  }

  private normalizeName(name: string): string {
    return this.cleanText(name).toLowerCase();
  }

  async createTag(
    userId: string,
    targetEntityId: string | null,
    createDto: CreateTagDto,
  ) {
    const cleanedName = this.cleanText(createDto.name);
    const cleanedDescription = createDto.description
      ? this.cleanText(createDto.description)
      : null;
    const normalizedName = this.cleanText(createDto.name).toLowerCase();

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

    try {
      const result = await this.pool.query(
        `INSERT INTO tags (org_id, name, normalized_name, type, description, created_by, updated_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $6) 
         RETURNING *`,
        [
          orgId,
          cleanedName,
          normalizedName,
          createDto.type,
          cleanedDescription,
          userId,
        ],
      );

      const newTag = result.rows[0];

      await this.auditService.log({
        entityType: 'tags',
        entityId: newTag.id,
        action: 'CREATE',
        beforeJson: null,
        afterJson: newTag,
        changedBy: userId,
        reasonContext: 'Tag created via API',
      });

      return newTag;
    } catch (error: any) {
      if (error.code === '23505') {
        // Unique violation
        throw new ConflictException(
          `A tag with name "${createDto.name}" already exists in type "${createDto.type}".`,
        );
      }
      throw error;
    }
  }

  async getTags(userId: string, query: { search?: string; type?: string; active?: string }) {
    const userRes = await this.pool.query(
      `SELECT org_id FROM public.users WHERE id = $1`,
      [userId]
    );
    const orgId = userRes.rows[0]?.org_id;

    const conditions: string[] = ['is_deleted = false'];
    const values: any[] = [];
    let counter = 1;

    if (orgId) {
      conditions.push(`org_id = $${counter++}`);
      values.push(orgId);
    }

    if (query.active !== undefined && query.active !== null) {
      conditions.push(`active = $${counter++}`);
      const activeStr = String(query.active).trim().toLowerCase();
      values.push(activeStr === 'true' || activeStr === '1');
    }

    if (query.type) {
      conditions.push(`type = $${counter++}`);
      values.push(query.type);
    }

    if (query.search) {
      conditions.push(`name ILIKE $${counter++}`);
      values.push(`%${query.search}%`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.pool.query(
      `SELECT id, name, type, description, active, created_at, updated_at 
       FROM tags 
       ${whereClause} 
       ORDER BY name ASC`,
      values,
    );

    return result.rows;
  }

  async getSuggestions(userId: string, type?: string, search?: string) {
    const userRes = await this.pool.query(
      `SELECT org_id FROM public.users WHERE id = $1`,
      [userId]
    );
    const orgId = userRes.rows[0]?.org_id;

    const conditions: string[] = ['is_deleted = false', 'active = true'];
    const values: any[] = [];
    let counter = 1;

    if (orgId) {
      conditions.push(`org_id = $${counter++}`);
      values.push(orgId);
    }

    if (type) {
      conditions.push(`type = $${counter++}`);
      values.push(type);
    }

    if (search) {
      conditions.push(`name ILIKE $${counter++}`);
      values.push(`%${search}%`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await this.pool.query(
      `SELECT id, name, type 
       FROM tags 
       ${whereClause} 
       ORDER BY name ASC 
       LIMIT 50`,
      values,
    );

    return result.rows;
  }

  async getTagById(id: string) {
    const result = await this.pool.query(
      `SELECT id, name, type, description, active, created_at, updated_at 
       FROM tags 
       WHERE id = $1 AND is_deleted = false`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Tag with ID ${id} not found.`);
    }

    return result.rows[0];
  }

  async updateTag(id: string, userId: string, updateDto: UpdateTagDto) {
    const currentResult = await this.pool.query(
      `SELECT * FROM tags WHERE id = $1 AND is_deleted = false`,
      [id],
    );

    if (currentResult.rows.length === 0) {
      throw new NotFoundException(`Tag with ID ${id} not found.`);
    }

    const currentTag = currentResult.rows[0];

    let normalizedName = currentTag.normalized_name;
    const updateFields: string[] = [];
    const values: any[] = [];
    let counter = 1;

    if (updateDto.name !== undefined) {
      const cleanedName = this.cleanText(updateDto.name);
      normalizedName = cleanedName.toLowerCase();
      updateFields.push(`name = $${counter++}`);
      values.push(cleanedName);
      updateFields.push(`normalized_name = $${counter++}`);
      values.push(normalizedName);
    }

    if (updateDto.type !== undefined) {
      updateFields.push(`type = $${counter++}`);
      values.push(updateDto.type);
    }

    if (updateDto.description !== undefined) {
      const cleanedDescription = updateDto.description
        ? this.cleanText(updateDto.description)
        : null;
      updateFields.push(`description = $${counter++}`);
      values.push(cleanedDescription);
    }

    if (updateDto.active !== undefined) {
      updateFields.push(`active = $${counter++}`);
      values.push(updateDto.active);
    }

    if (updateFields.length === 0) {
      return currentTag;
    }

    updateFields.push(`updated_by = $${counter++}`);
    values.push(userId);

    values.push(id); // For the WHERE clause id

    const queryStr = `UPDATE tags 
                      SET ${updateFields.join(', ')} 
                      WHERE id = $${counter} AND is_deleted = false 
                      RETURNING *`;

    try {
      const result = await this.pool.query(queryStr, values);

      const updatedTag = result.rows[0];

      await this.auditService.log({
        entityType: 'tags',
        entityId: updatedTag.id,
        action: 'UPDATE',
        beforeJson: currentTag,
        afterJson: updatedTag,
        changedBy: userId,
        reasonContext: 'Tag updated via API',
      });

      return updatedTag;
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException(
          `A tag with this name and type already exists.`,
        );
      }
      throw error;
    }
  }

  async deleteTag(id: string, userId: string) {
    const currentResult = await this.pool.query(
      `SELECT * FROM tags WHERE id = $1 AND is_deleted = false`,
      [id],
    );

    if (currentResult.rows.length === 0) {
      throw new NotFoundException(`Tag with ID ${id} not found.`);
    }

    const currentTag = currentResult.rows[0];

    const result = await this.pool.query(
      `UPDATE tags 
       SET active = false, is_deleted = true, deleted_at = now(), updated_by = $2 
       WHERE id = $1 
       RETURNING *`,
      [id, userId],
    );

    const deletedTag = result.rows[0];

    await this.auditService.log({
      entityType: 'tags',
      entityId: deletedTag.id,
      action: 'DELETE',
      beforeJson: currentTag,
      afterJson: deletedTag,
      changedBy: userId,
      reasonContext: 'Tag soft-deleted via API',
    });

    return { message: 'Tag successfully deactivated and deleted.' };
  }
}
