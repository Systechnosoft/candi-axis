import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { QUEUE_NAMES, DEFAULT_JOB_OPTIONS, QueueName } from './queue.constants';
import { BaseJobPayload } from './queue.types';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.RESUME_PARSING)
    private readonly resumeParsingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.AI_RATING) private readonly aiRatingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.REMINDERS) private readonly remindersQueue: Queue,
    @InjectQueue(QUEUE_NAMES.MAINTENANCE)
    private readonly maintenanceQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CALENDAR_INVITES)
    private readonly calendarInvitesQueue: Queue,
  ) {}

  /**
   * Helper function to get the correct queue instance.
   */
  private getQueue(queueName: QueueName): Queue {
    switch (queueName) {
      case QUEUE_NAMES.RESUME_PARSING:
        return this.resumeParsingQueue;
      case QUEUE_NAMES.AI_RATING:
        return this.aiRatingQueue;
      case QUEUE_NAMES.NOTIFICATIONS:
        return this.notificationsQueue;
      case QUEUE_NAMES.REMINDERS:
        return this.remindersQueue;
      case QUEUE_NAMES.MAINTENANCE:
        return this.maintenanceQueue;
      case QUEUE_NAMES.CALENDAR_INVITES:
        return this.calendarInvitesQueue;
      default:
        throw new Error(`Queue ${queueName} is not registered.`);
    }
  }

  /**
   * Enqueues a job generically across the ATS architecture.
   */
  async enqueue<T extends BaseJobPayload>(
    queueName: QueueName,
    jobName: string,
    payload: T,
    options?: JobsOptions,
  ) {
    const queue = this.getQueue(queueName);

    // Merge provided options over default MVP options.
    const jobOptions: JobsOptions = {
      ...DEFAULT_JOB_OPTIONS,
      ...options,
    };

    try {
      this.logger.debug(`Enqueueing job [${jobName}] to queue [${queueName}]`);
      const job = await queue.add(jobName, payload, jobOptions);
      this.logger.log(
        `Successfully enqueued job [${job.id}] to [${queueName}]`,
      );
      return job;
    } catch (error) {
      this.logger.error(
        `Failed to enqueue job [${jobName}] to [${queueName}]:`,
        error,
      );
      throw error;
    }
  }
}
