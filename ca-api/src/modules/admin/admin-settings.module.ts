import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminSettingsService } from './admin-settings.service';
import { AdminSettingsController } from './admin-settings.controller';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AuditModule } from '../audit/audit.module';
import { RbacModule } from '../rbac/rbac.module';
import { CandidatesModule } from '../candidates/candidates.module';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    RbacModule,
    ConfigModule,
    CandidatesModule,
  ],
  controllers: [AdminSettingsController],
  providers: [AdminSettingsService],
  exports: [AdminSettingsService],
})
export class AdminSettingsModule {}
