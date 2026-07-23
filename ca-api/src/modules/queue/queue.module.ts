import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from './queue.constants';
import { QueueService } from './queue.service';
import { ResumeParsingProcessor } from './processors/resume-parsing.processor';
import { AiRatingProcessor } from './processors/ai-rating.processor';
import { NotificationsProcessor } from './processors/notifications.processor';
import { RemindersProcessor } from './processors/reminders.processor';
import { MaintenanceProcessor } from './processors/maintenance.processor';
import { DocumentsModule } from '../documents/documents.module';
import { AdminSettingsModule } from '../admin/admin-settings.module';
import { StorageModule } from '../storage/storage.module';
import { AiModule } from '../ai/ai.module';
import { EmailModule } from '../email/email.module';
import { CalendarInviteProcessor } from './processors/calendar-invite.processor';

@Module({
  imports: [
    // Register the core BullMQ configuration using the application's ConfigService
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),

    // Register each specific ATS queue
    BullModule.registerQueue(
      { name: QUEUE_NAMES.RESUME_PARSING },
      { name: QUEUE_NAMES.AI_RATING },
      { name: QUEUE_NAMES.NOTIFICATIONS },
      { name: QUEUE_NAMES.REMINDERS },
      { name: QUEUE_NAMES.MAINTENANCE },
      { name: QUEUE_NAMES.CALENDAR_INVITES },
    ),

    // Dependencies needed by processors
    forwardRef(() => DocumentsModule),
    AdminSettingsModule,
    StorageModule,
    AiModule,
    EmailModule,
  ],
  providers: [
    QueueService,
    ResumeParsingProcessor,
    AiRatingProcessor,
    NotificationsProcessor,
    RemindersProcessor,
    MaintenanceProcessor,
    CalendarInviteProcessor,
  ],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
