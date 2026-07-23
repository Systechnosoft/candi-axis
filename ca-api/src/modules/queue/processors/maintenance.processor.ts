import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../queue.constants';
import { MaintenanceJobPayload } from '../queue.types';

@Processor(QUEUE_NAMES.MAINTENANCE)
export class MaintenanceProcessor extends WorkerHost {
  private readonly logger = new Logger(MaintenanceProcessor.name);

  async process(job: Job<MaintenanceJobPayload>) {
    this.logger.debug(`Starting processing for job [${job.id}] in queue [${QUEUE_NAMES.MAINTENANCE}]`);
    
    try {
      this.logger.log(`Mock Maintenance executing task [${job.data.taskName}]`);
    } catch (error) {
      this.logger.error(`Error processing job [${job.id}]:`, error);
      throw error;
    }
  }
}
