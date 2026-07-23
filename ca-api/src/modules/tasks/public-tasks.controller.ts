import { Controller, Get, Param, Res } from '@nestjs/common';
import { TasksService } from './tasks.service';
import * as express from 'express';

@Controller('tasks')
export class PublicTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get(':id/pixel')
  async trackPixel(@Param('id') id: string, @Res() res: express.Response) {
    await this.tasksService.markAsRead(id);
    
    // Return a 1x1 transparent GIF
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set({
      'Content-Type': 'image/gif',
      'Content-Length': gif.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    });
    res.status(200).send(gif);
  }
}
