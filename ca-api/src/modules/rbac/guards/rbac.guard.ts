import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../rbac.service';
import {
  REQUIRE_MODULE_KEY,
  RequireModuleMeta,
} from '../decorators/require-module.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<
      RequireModuleMeta | undefined
    >(REQUIRE_MODULE_KEY, [ctx.getHandler(), ctx.getClass()]);

    if (!meta) return true; // No module restriction — JWT guard alone covers auth

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { atsUserId: string } | undefined;
    if (!user) throw new ForbiddenException('Not authenticated');

    const access = await this.rbacService.getUserModuleAccess(user.atsUserId);
    const allowed = this.rbacService.hasAccess(
      access,
      meta.moduleCode,
      meta.minLevel,
    );

    if (!allowed) {
      throw new ForbiddenException(
        `Insufficient access for module "${meta.moduleCode}". Required: ${meta.minLevel}.`,
      );
    }
    return true;
  }
}
