import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../queue.constants';
import { NotificationJobPayload } from '../queue.types';

@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  async process(job: Job<NotificationJobPayload>) {
    this.logger.debug(
      `Starting processing for job [${job.id}] in queue [${QUEUE_NAMES.NOTIFICATIONS}]`,
    );

    try {
      this.logger.log(
        `Mock Notification delivery to user [${job.data.recipientId}] template [${job.data.templateId}]`,
      );
    } catch (error) {
      this.logger.error(`Error processing job [${job.id}]:`, error);
      throw error;
    }
  }
}
