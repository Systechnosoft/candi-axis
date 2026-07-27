import { Module } from '@nestjs/common';
import { JobDescriptionsService } from './job-descriptions.service';
import { PrismaService } from './prisma.service';
import { JobDescriptionsController } from './job-descriptions.controller';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AuditModule } from '../audit/audit.module';
import { RbacModule } from '../rbac/rbac.module';
import { MatchingModule } from '../matching/matching.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    AuditModule,
    RbacModule,
    MatchingModule,
  ],
  controllers: [JobDescriptionsController],
  providers: [JobDescriptionsService, PrismaService],
  exports: [JobDescriptionsService],
})
export class JobDescriptionsModule {}
