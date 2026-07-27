import {
  Injectable,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';

export interface SupabaseJwtPayload {
  sub: string; // Supabase Auth user ID
  email: string;
  aud: string;
  role: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Resolves the ATS internal user record from a verified Supabase Auth identity.
   * Throws UnauthorizedException if no ATS user is mapped to the given Supabase user ID.
   */
  async resolveAtsUser(
    supabaseUserId: string,
    email: string,
  ): Promise<{ atsUserId: string; email: string }> {
    this.logger.debug(
      `Resolving ATS user for Supabase ID: ${supabaseUserId}, Email: ${email}`,
    );
    // First try by supabase_auth_user_id (authoritative mapping)
    const byId = await this.pool.query(
      `SELECT id, email, is_active, status, is_deleted
       FROM ca_users WHERE supabase_auth_user_id = $1 LIMIT 1`,
      [supabaseUserId],
    );

    let user = byId.rows[0];
    if (user) {
      this.logger.debug(`Found user by Supabase ID: ${user.id}`);
    } else {
      this.logger.debug(`User not found by Supabase ID, trying fallback...`);
    }

    // Fallback: match by normalized email (handles pre-existing users not yet linked)
    if (!user) {
      const normalized = email.trim().toLowerCase();
      const byEmail = await this.pool.query(
        `SELECT id, email, is_active, status, is_deleted
         FROM ca_users WHERE email_normalized = $1 AND supabase_auth_user_id IS NULL LIMIT 1`,
        [normalized],
      );
      user = byEmail.rows[0];

      // If found by email, link the supabase_auth_user_id for future lookups
      if (user) {
        this.logger.debug(
          `Found user by normalized email: ${user.id}. Linking Supabase ID...`,
        );
        await this.pool.query(
          `UPDATE ca_users SET supabase_auth_user_id = $1 WHERE id = $2`,
          [supabaseUserId, user.id],
        );
        this.logger.log(
          `Linked supabase_auth_user_id to existing ATS user: ${email}`,
        );

        // Audit log the mapping
        await this.pool.query(
          `INSERT INTO ca_audit_logs (entity_type, entity_id, action, before_json, after_json, reason_context)
           VALUES ('users', $1, 'link_identity', $2, $3, 'Auto-linked Supabase identity on first login')`,
          [
            user.id,
            { supabase_auth_user_id: null },
            { supabase_auth_user_id: supabaseUserId },
          ],
        );
      } else {
        this.logger.debug(
          `Fallback failed. user not found by email or already linked to another ID.`,
        );
      }
    }

    if (!user) {
      this.logger.warn(
        `No ATS user mapping found for Supabase user: ${supabaseUserId} (${email})`,
      );
      throw new UnauthorizedException('No ATS account found for this identity');
    }

    if (user.is_deleted || !user.is_active || user.status !== 'active') {
      this.logger.warn(
        `ATS user is inactive/deleted: ${email} (status: ${user.status}, is_active: ${user.is_active}, is_deleted: ${user.is_deleted})`,
      );
      throw new UnauthorizedException('Account is not active');
    }

    // Update last_login_at
    await this.pool.query(
      `UPDATE ca_users SET last_login_at = now() WHERE id = $1`,
      [user.id],
    );

    return { atsUserId: user.id, email: user.email };
  }

  /**
   * Returns the full ATS RBAC session for a given ATS user ID.
   * Used by GET /auth/me.
   */
  async getSession(atsUserId: string) {
    this.logger.debug(`Fetching session for ATS User ID: ${atsUserId}`);
    const userResult = await this.pool.query(
      `SELECT id, email, full_name, designation, department, timezone, status, org_id
       FROM ca_users WHERE id = $1 AND is_deleted = false`,
      [atsUserId],
    );
    const user = userResult.rows[0];
    if (!user) throw new UnauthorizedException('User not found');

    const rolesResult = await this.pool.query(
      `SELECT r.code, r.name FROM ca_user_roles ur
       JOIN ca_roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [atsUserId],
    );

    const accessResult = await this.pool.query(
      `SELECT m.code,
         CASE 
           WHEN BOOL_OR(rp.can_delete) THEN 'administrator'
           WHEN BOOL_OR(rp.can_create) OR BOOL_OR(rp.can_update) THEN 'editor'
           WHEN BOOL_OR(rp.can_read) THEN 'viewer'
           ELSE 'deny'
         END as access_level
       FROM ca_user_roles ur
       JOIN ca_role_permissions rp ON rp.role_id = ur.role_id
       JOIN ca_modules m ON m.id = rp.module_id
       WHERE ur.user_id = $1
       GROUP BY m.code`,
      [atsUserId],
    );

    const access: Record<string, string> = {};
    for (const row of accessResult.rows) {
      access[row.code] = row.access_level;
    }

    return {
      user,
      roles: rolesResult.rows.map((r) => r.code),
      access,
    };
  }
}
