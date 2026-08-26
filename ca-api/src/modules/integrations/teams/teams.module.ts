import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { RbacModule } from '../../rbac/rbac.module';

import { AdminSettingsModule } from '../../admin/admin-settings.module';

@Module({
  imports: [RbacModule, AdminSettingsModule],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsIntegrationModule {}
