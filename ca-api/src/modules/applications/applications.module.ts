import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationStageService } from './application-stage.service';
import { ApplicationsController } from './applications.controller';
import { AuditModule } from '../audit/audit.module';
import { QueueModule } from '../queue/queue.module';
import { DocumentsModule } from '../documents/documents.module';
import { RbacModule } from '../rbac/rbac.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [AuditModule, QueueModule, DocumentsModule, RbacModule, EmailModule],
  providers: [ApplicationsService, ApplicationStageService],
  controllers: [ApplicationsController],
  exports: [ApplicationsService, ApplicationStageService],
})
export class ApplicationsModule {}
