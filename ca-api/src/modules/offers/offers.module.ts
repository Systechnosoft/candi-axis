import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { RbacModule } from '../rbac/rbac.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [RbacModule, AuditModule],
  controllers: [OffersController],
  providers: [OffersService],
})
export class OffersModule {}
