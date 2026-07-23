import { Module } from '@nestjs/common';
import { BootstrapService } from './bootstrap.service';
import { AuditModule } from '../modules/audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [BootstrapService],
  exports: [BootstrapService],
})
export class BootstrapModule {}
