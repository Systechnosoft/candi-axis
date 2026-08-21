import { Module } from '@nestjs/common';
import { WebexService } from './webex.service';
import { WebexController } from './webex.controller';
import { RbacModule } from '../../rbac/rbac.module';

@Module({
  imports: [RbacModule],
  controllers: [WebexController],
  providers: [WebexService],
  exports: [WebexService],
})
export class WebexIntegrationModule {}
