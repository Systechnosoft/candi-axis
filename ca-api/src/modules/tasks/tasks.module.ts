import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { PublicTasksController } from './public-tasks.controller';
import { TasksService } from './tasks.service';
import { ApplicationsModule } from '../applications/applications.module';
import { AuditModule } from '../audit/audit.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [ApplicationsModule, AuditModule, RbacModule],
  controllers: [TasksController, PublicTasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
