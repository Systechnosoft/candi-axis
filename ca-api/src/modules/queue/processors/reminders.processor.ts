import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../queue.constants';
import { ReminderJobPayload } from '../queue.types';

@Processor(QUEUE_NAMES.REMINDERS)
export class RemindersProcessor extends WorkerHost {
  private readonly logger = new Logger(RemindersProcessor.name);

  async process(job: Job<ReminderJobPayload>) {
    this.logger.debug(
      `Starting processing for job [${job.id}] in queue [${QUEUE_NAMES.REMINDERS}]`,
    );

    try {
      this.logger.log(
        `Mock Reminder processing for [${job.data.entityType}]:[${job.data.entityId}] action [${job.data.action}]`,
      );
    } catch (error) {
      this.logger.error(`Error processing job [${job.id}]:`, error);
      throw error;
    }
  }
}
