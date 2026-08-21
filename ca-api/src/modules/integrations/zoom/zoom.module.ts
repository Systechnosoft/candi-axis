import { Module } from '@nestjs/common';
import { ZoomService } from './zoom.service';
import { ZoomController } from './zoom.controller';
import { RbacModule } from '../../rbac/rbac.module';

@Module({
  imports: [RbacModule],
  controllers: [ZoomController],
  providers: [ZoomService],
  exports: [ZoomService],
})
export class ZoomIntegrationModule {}
