import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private supabaseAdmin: SupabaseClient;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (supabaseUrl && serviceRoleKey) {
      this.supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
  }

  private cleanText(text?: string): string {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ');
  }

  async getLookups() {
    const result = await this.pool.query(
      `SELECT id, first_name, last_name, email 
       FROM ca_users 
       WHERE is_active = true 
       ORDER BY first_name ASC, last_name ASC`,
    );
    return result.rows;
  }

  async getHiringManagers() {
    const result = await this.pool.query(
      `SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, u.full_name
       FROM ca_users u
       JOIN ca_user_roles ur ON u.id = ur.user_id
       JOIN ca_roles r ON r.id = ur.role_id
       WHERE u.is_active = true 
       AND u.is_deleted = false
       AND u.status = 'active'
       AND r.code = 'hiring_manager'
       ORDER BY u.full_name ASC`,
    );
    return result.rows;
  }

  async getHrRecruiters() {
    const result = await this.pool.query(
      `SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, u.full_name
       FROM ca_users u
       JOIN ca_user_roles ur ON u.id = ur.user_id
       JOIN ca_roles r ON r.id = ur.role_id
       WHERE u.is_active = true 
       AND u.is_deleted = false
       AND u.status = 'active'
       AND r.code = 'hr_recruiter'
       ORDER BY u.full_name ASC`,
    );
    return result.rows;
  }

  async getInterviewers() {
    const result = await this.pool.query(
      `SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, u.full_name
       FROM ca_users u
       JOIN ca_user_roles ur ON u.id = ur.user_id
       JOIN ca_roles r ON r.id = ur.role_id
       WHERE u.is_active = true 
       AND u.is_deleted = false
       AND u.status = 'active'
       AND r.code = 'interviewer'
       ORDER BY u.full_name ASC`,
    );
    return result.rows;
  }

  async findAll() {
    const result = await this.pool.query(
      `SELECT u.id, u.email, u.full_name, u.employee_code, u.department, u.status, u.is_active, u.created_at, u.updated_at, u.org_id,
              (SELECT r.code FROM ca_user_roles ur JOIN ca_roles r ON r.id = ur.role_id WHERE ur.user_id = u.id LIMIT 1) as role_code,
              updater.full_name as updated_by_name
       FROM ca_users u
       LEFT JOIN ca_users updater ON updater.id = u.updated_by
       WHERE u.is_deleted = false
       ORDER BY u.created_at DESC`,
    );
    return result.rows;
  }

  async findById(id: string) {
    const result = await this.pool.query(
      `SELECT u.id, u.email, u.full_name, u.employee_code, u.department, u.status, u.is_active, u.created_at, u.updated_at, u.supabase_auth_user_id, u.org_id,
              (SELECT r.code FROM ca_user_roles ur JOIN ca_roles r ON r.id = ur.role_id WHERE ur.user_id = u.id LIMIT 1) as role_code
       FROM ca_users u
       WHERE u.id = $1 AND u.is_deleted = false`,
      [id],
    );
    if (!result.rows[0]) throw new NotFoundException('User not found');
    return result.rows[0];
  }

  async createUser(actorId: string, dto: CreateUserDto) {
    if (!this.supabaseAdmin) {
      throw new InternalServerErrorException(
        'Supabase Admin client not configured',
      );
    }

    const emailNormalized = dto.email.trim().toLowerCase();
    const fullName = this.cleanText(dto.full_name);
    const department = this.cleanText(dto.department);
    const employeeCode = dto.employee_code?.trim() || null;
    const roleCode = dto.role_code.trim().toLowerCase();

    // Check if role exists
    const roleResult = await this.pool.query(
      `SELECT id FROM ca_roles WHERE code = $1`,
      [roleCode],
    );
    if (!roleResult.rows[0]) {
      throw new BadRequestException(`Role '${roleCode}' does not exist`);
    }
    const roleId = roleResult.rows[0].id;

    // Fetch actor details to validate permissions/org mapping
    const actorRes = await this.pool.query(
      `SELECT u.org_id, r.code as role_code 
       FROM ca_users u 
       JOIN ca_user_roles ur ON ur.user_id = u.id 
       JOIN ca_roles r ON r.id = ur.role_id 
       WHERE u.id = $1`,
      [actorId],
    );
    const actor = actorRes.rows[0];
    const isActorSuperAdmin = actor?.role_code === 'super_admin';

    // Determine target org_id
    let targetOrgId: string | null = null;
    if (roleCode === 'super_admin') {
      targetOrgId = null;
    } else {
      if (isActorSuperAdmin) {
        if (!dto.org_id) {
          throw new BadRequestException(
            'org_id is mandatory for non-Super-Admin users',
          );
        }
        targetOrgId = dto.org_id;
      } else {
        targetOrgId = actor?.org_id || null;
        if (!targetOrgId) {
          throw new BadRequestException(
            'User is not associated with an organization',
          );
        }
      }
    }

    // Check local duplicate
    const existing = await this.pool.query(
      `SELECT id FROM ca_users WHERE email_normalized = $1`,
      [emailNormalized],
    );
    if (existing.rows[0]) {
      throw new ConflictException('User with this email already exists');
    }

    let supabaseAuthUserId: string;

    // 1. Check Supabase Auth
    try {
      const { data: listData, error: listError } =
        await this.supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const existingAuthUser = listData.users.find(
        (u) => u.email === emailNormalized,
      );
      if (existingAuthUser) {
        supabaseAuthUserId = existingAuthUser.id;
      } else {
        // Create in Supabase mapping
        const { data: created, error: createError } =
          await this.supabaseAdmin.auth.admin.createUser({
            email: emailNormalized,
            email_confirm: true,
            password: 'Password123!',
            user_metadata: { name: fullName },
          });
        if (createError) throw createError;
        supabaseAuthUserId = created.user.id;
      }
    } catch (err: any) {
      this.logger.error('Failed to provision Supabase user', err);
      throw new InternalServerErrorException(
        'Failed to provision user identity',
      );
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const splitName = fullName.split(' ');
      const firstName = splitName[0];
      const lastName = splitName.slice(1).join(' ') || null;
      const status = dto.status || 'active';
      const isActive = status === 'active';

      const userInsert = await client.query(
        `INSERT INTO ca_users (
          email, email_normalized, full_name, first_name, last_name, 
          employee_code, department, status, is_active, 
          supabase_auth_user_id, created_by, updated_by, org_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $12)
        RETURNING *`,
        [
          dto.email,
          emailNormalized,
          fullName,
          firstName,
          lastName,
          employeeCode,
          department,
          status,
          isActive,
          supabaseAuthUserId,
          actorId,
          targetOrgId,
        ],
      );
      const newUser = userInsert.rows[0];

      await client.query(
        `INSERT INTO ca_user_roles (user_id, role_id, is_primary) VALUES ($1, $2, true)`,
        [newUser.id, roleId],
      );

      await this.auditService.log({
        entityType: 'users',
        entityId: newUser.id,
        action: 'CREATE',
        changedBy: actorId,
        afterJson: {
          email: emailNormalized,
          full_name: fullName,
          role_code: roleCode,
        },
      });

      await client.query('COMMIT');
      return { ...newUser, role_code: roleCode };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateUser(targetId: string, actorId: string, dto: UpdateUserDto) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const currentRes = await client.query(
        `SELECT * FROM ca_users WHERE id = $1 AND is_deleted = false`,
        [targetId],
      );
      const current = currentRes.rows[0];
      if (!current) throw new NotFoundException('User not found');

      const updates: string[] = [];

      const values: any[] = [];
      let paramCount = 1;

      if (dto.full_name !== undefined) {
        const fullName = this.cleanText(dto.full_name);
        const splitName = fullName.split(' ');
        const firstName = splitName[0];
        const lastName = splitName.slice(1).join(' ') || null;

        updates.push(`full_name = $${paramCount++}`);
        values.push(fullName);
        updates.push(`first_name = $${paramCount++}`);
        values.push(firstName);
        updates.push(`last_name = $${paramCount++}`);
        values.push(lastName);
      }

      if (dto.department !== undefined) {
        updates.push(`department = $${paramCount++}`);
        values.push(this.cleanText(dto.department));
      }

      if (dto.employee_code !== undefined) {
        updates.push(`employee_code = $${paramCount++}`);
        values.push(dto.employee_code.trim() || null);
      }

      // Handle role-based org_id alignment
      if (dto.role_code !== undefined) {
        const finalRoleCode = dto.role_code.trim().toLowerCase();
        if (finalRoleCode === 'super_admin') {
          updates.push(`org_id = $${paramCount++}`);
          values.push(null);
        } else {
          // If role is changing to non-super_admin, ensure they have an org_id
          const currentRoleRes = await client.query(
            `SELECT r.code FROM ca_user_roles ur JOIN ca_roles r ON r.id = ur.role_id WHERE ur.user_id = $1 LIMIT 1`,
            [targetId],
          );
          const currentRoleCode = currentRoleRes.rows[0]?.code;
          if (
            currentRoleCode === 'super_admin' &&
            !dto.org_id &&
            !current.org_id
          ) {
            throw new BadRequestException(
              'org_id is mandatory when changing role from Super Admin',
            );
          }
        }
      }

      if (dto.org_id !== undefined) {
        const actorRes = await client.query(
          `SELECT r.code as role_code 
           FROM ca_users u 
           JOIN ca_user_roles ur ON ur.user_id = u.id 
           JOIN ca_roles r ON r.id = ur.role_id 
           WHERE u.id = $1`,
          [actorId],
        );
        const isActorSuperAdmin = actorRes.rows[0]?.role_code === 'super_admin';
        if (!isActorSuperAdmin) {
          throw new BadRequestException(
            'Only Super Admin can modify organization association',
          );
        }

        let finalRoleCode = current.role_code;
        if (dto.role_code) {
          finalRoleCode = dto.role_code.trim().toLowerCase();
        } else {
          const currentRoleRes = await client.query(
            `SELECT r.code FROM ca_user_roles ur JOIN ca_roles r ON r.id = ur.role_id WHERE ur.user_id = $1 LIMIT 1`,
            [targetId],
          );
          finalRoleCode = currentRoleRes.rows[0]?.code;
        }

        let newOrgId: string | null = dto.org_id;
        if (finalRoleCode === 'super_admin') {
          newOrgId = null;
        } else if (!newOrgId) {
          throw new BadRequestException(
            'org_id is mandatory for non-Super-Admin users',
          );
        }

        updates.push(`org_id = $${paramCount++}`);
        values.push(newOrgId);
      }

      if (updates.length > 0) {
        updates.push(`updated_by = $${paramCount++}`);
        values.push(actorId);

        values.push(targetId); // ID for WHERE clause
        await client.query(
          `UPDATE ca_users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
          values,
        );
      }

      if (dto.role_code) {
        const roleResult = await client.query(
          `SELECT id FROM ca_roles WHERE code = $1`,
          [dto.role_code],
        );
        if (!roleResult.rows[0])
          throw new BadRequestException(
            `Role '${dto.role_code}' does not exist`,
          );

        // MVP: Reset primary role
        await client.query(`DELETE FROM ca_user_roles WHERE user_id = $1`, [
          targetId,
        ]);
        await client.query(
          `INSERT INTO ca_user_roles (user_id, role_id, is_primary) VALUES ($1, $2, true)`,
          [targetId, roleResult.rows[0].id],
        );
      }

      await this.auditService.log({
        entityType: 'users',
        entityId: targetId,
        action: 'UPDATE',
        changedBy: actorId,
        beforeJson: {
          full_name: current.full_name,
          department: current.department,
          employee_code: current.employee_code,
        },
        afterJson: {
          full_name: dto.full_name,
          department: dto.department,
          employee_code: dto.employee_code,
          role_code: dto.role_code,
        },
      });

      await client.query('COMMIT');
      return this.findById(targetId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateUserStatus(
    targetId: string,
    actorId: string,
    dto: UpdateUserStatusDto,
  ) {
    const currentRes = await this.pool.query(
      `SELECT status FROM ca_users WHERE id = $1 AND is_deleted = false`,
      [targetId],
    );
    if (!currentRes.rows[0]) throw new NotFoundException('User not found');

    const isActive = dto.status === 'active';
    await this.pool.query(
      `UPDATE ca_users SET status = $1, is_active = $2, updated_by = $3 WHERE id = $4`,
      [dto.status, isActive, actorId, targetId],
    );

    await this.auditService.log({
      entityType: 'users',
      entityId: targetId,
      action: 'UPDATE_STATUS',
      changedBy: actorId,
      beforeJson: { status: currentRes.rows[0].status },
      afterJson: { status: dto.status },
    });

    return this.findById(targetId);
  }

  async deleteUser(targetId: string, actorId: string) {
    if (targetId === actorId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const current = await this.findById(targetId);
    if (!current) throw new NotFoundException('User not found');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update locally
      await client.query(
        `UPDATE ca_users SET is_deleted = true, is_active = false, status = 'inactive', updated_by = $1 WHERE id = $2`,
        [actorId, targetId],
      );

      // Clean up user roles to prevent orphaned records
      await client.query(`DELETE FROM ca_user_roles WHERE user_id = $1`, [
        targetId,
      ]);

      // If Supabase is configured, delete from Supabase Auth as well
      if (this.supabaseAdmin && current.supabase_auth_user_id) {
        try {
          const { error } = await this.supabaseAdmin.auth.admin.deleteUser(
            current.supabase_auth_user_id,
          );
          if (error) {
            this.logger.error(
              `Failed to delete user from Supabase Auth: ${error.message}`,
            );
          }
        } catch (supabaseErr) {
          this.logger.error('Supabase Auth user deletion failed', supabaseErr);
        }
      }

      await this.auditService.log({
        entityType: 'users',
        entityId: targetId,
        action: 'DELETE',
        changedBy: actorId,
        beforeJson: { email: current.email, full_name: current.full_name },
        afterJson: null,
      });

      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
