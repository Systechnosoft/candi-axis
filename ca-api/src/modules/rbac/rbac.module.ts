import { Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RbacGuard } from './guards/rbac.guard';
import { RolesController } from './roles.controller';

@Module({
  controllers: [RolesController],
  providers: [RbacService, RbacGuard],
  exports: [RbacService, RbacGuard],
})
export class RbacModule {}
