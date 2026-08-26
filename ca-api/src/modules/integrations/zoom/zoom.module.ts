import { Module } from '@nestjs/common';
import { ZoomService } from './zoom.service';
import { ZoomController } from './zoom.controller';
import { RbacModule } from '../../rbac/rbac.module';
import { AdminSettingsModule } from '../../admin/admin-settings.module';

@Module({
  imports: [RbacModule, AdminSettingsModule],
  controllers: [ZoomController],
  providers: [ZoomService],
  exports: [ZoomService],
})
export class ZoomIntegrationModule {}
