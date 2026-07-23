import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { EntityTagsController } from './entity-tags.controller';
import { EntityTagsService } from './entity-tags.service';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [DatabaseModule, AuditModule, RbacModule],
  controllers: [TagsController, EntityTagsController],
  providers: [TagsService, EntityTagsService],
  exports: [TagsService, EntityTagsService],
})
export class TagsModule {}
