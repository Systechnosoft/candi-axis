import { Module } from '@nestjs/common';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { CandidateDuplicateService } from './candidate-duplicate.service';
import { CandidateParserMappingService } from './candidate-parser-mapping.service';
import { AuditModule } from '../audit/audit.module';
import { DocumentsModule } from '../documents/documents.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [AuditModule, DocumentsModule, RbacModule],
  controllers: [CandidatesController],
  providers: [
    CandidatesService,
    CandidateDuplicateService,
    CandidateParserMappingService,
  ],
  exports: [CandidatesService],
})
export class CandidatesModule {}
