import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';
import { Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from './guards/rbac.guard';
import { RequireModule } from './decorators/require-module.decorator';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('roles')
export class RolesController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get('modules')
  @RequireModule('roles', 'viewer')
  async getModules() {
    const res = await this.pool.query(
      `SELECT id, code, name, description, module_group, sort_order, is_platform_only 
       FROM public.ca_modules 
       ORDER BY sort_order ASC`,
    );
    return res.rows;
  }

  @Get()
  @RequireModule('roles', 'viewer')
  async getRoles(@Query('org_id') orgId?: string) {
    let query = `
      SELECT r.id, r.name, r.code, r.role_type, r.level, r.org_id, 
             r.is_system_role, r.is_editable, r.is_active,
             (SELECT COUNT(*) FROM public.ca_user_roles ur WHERE ur.role_id = r.id)::int as user_count
      FROM public.ca_roles r
      WHERE r.deleted_at IS NULL
    `;
    const params: any[] = [];
    if (orgId) {
      query += ` AND (r.org_id = $1 OR r.org_id IS NULL)`;
      params.push(orgId);
    }

    const res = await this.pool.query(query, params);
    return res.rows;
  }

  @Get(':id')
  @RequireModule('roles', 'viewer')
  async getRole(@Param('id') id: string) {
    const roleRes = await this.pool.query(
      `SELECT id, name, code, role_type, level, org_id, is_system_role, is_editable, is_active
       FROM public.ca_roles WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (roleRes.rows.length === 0)
      throw new NotFoundException('Role not found');
    const role = roleRes.rows[0];

    const permRes = await this.pool.query(
      `SELECT rp.module_id, m.code as module_code, m.name as module_name, 
              rp.can_read, rp.can_create, rp.can_update, rp.can_delete
       FROM public.ca_role_permissions rp
       JOIN public.ca_modules m ON m.id = rp.module_id
       WHERE rp.role_id = $1`,
      [id],
    );
    role.permissions = permRes.rows;
    return role;
  }

  @Post()
  @RequireModule('roles', 'editor')
  async createRole(@Request() req: any, @Body() data: any) {
    const orgId = data.org_id || null;
    const code = data.name.toLowerCase().replace(/\s+/g, '_');

    const roleRes = await this.pool.query(
      `INSERT INTO public.ca_roles (name, code, role_type, level, org_id, is_system_role, is_editable, is_active)
       VALUES ($1, $2, $3, $4, $5, false, true, true)
       RETURNING id, name, code, role_type, level, org_id, is_system_role, is_editable, is_active`,
      [data.name, code, data.role_type || 'CUSTOM', data.level || 10, orgId],
    );
    const newRole = roleRes.rows[0];

    if (data.permissions && Array.isArray(data.permissions)) {
      for (const p of data.permissions) {
        await this.pool.query(
          `INSERT INTO public.ca_role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (role_id, module_id) DO UPDATE
           SET can_read = EXCLUDED.can_read,
               can_create = EXCLUDED.can_create,
               can_update = EXCLUDED.can_update,
               can_delete = EXCLUDED.can_delete`,
          [
            newRole.id,
            p.module_id,
            !!p.can_read,
            !!p.can_create,
            !!p.can_update,
            !!p.can_delete,
          ],
        );
      }
    }

    return newRole;
  }

  @Patch(':id')
  @RequireModule('roles', 'editor')
  async updateRole(@Param('id') id: string, @Body() data: any) {
    // Update role details
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.role_type !== undefined) {
      updates.push(`role_type = $${paramIndex++}`);
      params.push(data.role_type);
    }
    if (data.level !== undefined) {
      updates.push(`level = $${paramIndex++}`);
      params.push(data.level);
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(data.is_active);
    }

    if (updates.length > 0) {
      params.push(id);
      await this.pool.query(
        `UPDATE public.ca_roles SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        params,
      );
    }

    if (data.permissions && Array.isArray(data.permissions)) {
      for (const p of data.permissions) {
        await this.pool.query(
          `INSERT INTO public.ca_role_permissions (role_id, module_id, can_read, can_create, can_update, can_delete)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (role_id, module_id) DO UPDATE
           SET can_read = EXCLUDED.can_read,
               can_create = EXCLUDED.can_create,
               can_update = EXCLUDED.can_update,
               can_delete = EXCLUDED.can_delete`,
          [
            id,
            p.module_id,
            !!p.can_read,
            !!p.can_create,
            !!p.can_update,
            !!p.can_delete,
          ],
        );
      }
    }

    return { success: true };
  }

  @Delete(':id')
  @RequireModule('roles', 'editor')
  async deleteRole(@Param('id') id: string) {
    await this.pool.query(
      `UPDATE public.ca_roles SET deleted_at = now() WHERE id = $1`,
      [id],
    );
    return { success: true };
  }
}
