import { Module, forwardRef } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { QueueModule } from '../queue/queue.module';
import { PdfLinkAnnotatorService } from './parsing/pdf-link-annotator.service';

@Module({
  imports: [AuditModule, StorageModule, forwardRef(() => QueueModule)],
  controllers: [DocumentsController],
  providers: [DocumentsService, PdfLinkAnnotatorService],
  exports: [DocumentsService, PdfLinkAnnotatorService],
})
export class DocumentsModule {}
