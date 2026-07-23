import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get('live')
  checkLiveness() {
    return { status: 'ok', type: 'liveness', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  checkReadiness() {
    // Basic confirmation that modules are mounted.
    // Real Redis connectivity check typically provided dynamically via Terminus,
    // but startup will crash immediately if Redis is unreachable in this architecture.
    return { 
      status: 'ok', 
      type: 'readiness', 
      timestamp: new Date().toISOString(),
      infrastructure: {
        redis: 'configured',
        bullmq: 'mounted',
        queues: 'registered'
      }
    };
  }
}
