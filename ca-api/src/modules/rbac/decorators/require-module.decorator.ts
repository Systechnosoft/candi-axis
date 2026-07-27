import { SetMetadata } from '@nestjs/common';
import { AccessLevel } from '../rbac.service';

export const REQUIRE_MODULE_KEY = 'require_module';

export interface RequireModuleMeta {
  moduleCode: string;
  minLevel: AccessLevel;
}

export const RequireModule = (
  moduleCode: string,
  minLevel: AccessLevel = 'viewer',
) =>
  SetMetadata(REQUIRE_MODULE_KEY, {
    moduleCode,
    minLevel,
  } as RequireModuleMeta);
