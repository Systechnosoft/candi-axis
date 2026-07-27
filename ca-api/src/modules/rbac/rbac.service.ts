import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';

export type AccessLevel = 'deny' | 'viewer' | 'editor' | 'administrator';

const LEVEL_RANK: Record<AccessLevel, number> = {
  deny: 0,
  viewer: 1,
  editor: 2,
  administrator: 3,
};

@Injectable()
export class RbacService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getUserModuleAccess(
    userId: string,
  ): Promise<Record<string, AccessLevel>> {
    const result = await this.pool.query(
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
      [userId],
    );

    const access: Record<string, AccessLevel> = {};
    for (const row of result.rows) {
      access[row.code] = row.access_level as AccessLevel;
    }
    return access;
  }

  hasAccess(
    userAccess: Record<string, AccessLevel>,
    moduleCode: string,
    minLevel: AccessLevel,
  ): boolean {
    const level = userAccess[moduleCode];
    if (!level) return false;
    return LEVEL_RANK[level] >= LEVEL_RANK[minLevel];
  }
}
