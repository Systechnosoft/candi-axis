import { Module } from '@nestjs/common';
import { WebexService } from './webex.service';
import { WebexController } from './webex.controller';
import { WebexCallbackController } from './webex-callback.controller';
import { RbacModule } from '../../rbac/rbac.module';
import { AdminSettingsModule } from '../../admin/admin-settings.module';

@Module({
  imports: [RbacModule, AdminSettingsModule],
  controllers: [WebexController, WebexCallbackController],
  providers: [WebexService],
  exports: [WebexService],
})
export class WebexIntegrationModule {}
