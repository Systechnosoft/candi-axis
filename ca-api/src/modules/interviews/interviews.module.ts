import { Module } from '@nestjs/common';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { RbacModule } from '../rbac/rbac.module';
import { EmailModule } from '../email/email.module';
import { QueueModule } from '../queue/queue.module';
import { GoogleCalendarModule } from '../integrations/google-calendar/google-calendar.module';

@Module({
  imports: [RbacModule, EmailModule, QueueModule, GoogleCalendarModule],
  controllers: [InterviewsController],
  providers: [InterviewsService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
