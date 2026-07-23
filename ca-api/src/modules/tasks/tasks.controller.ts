import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequireModule } from '../rbac/decorators/require-module.decorator';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequireModule('feedback', 'viewer')
  @ApiOperation({ summary: 'List all tasks assigned to the current interviewer' })
  async findAll(@Request() req: any) {
    return this.tasksService.findAll(req.user.atsUserId);
  }

  @Get(':id')
  @RequireModule('feedback', 'viewer')
  @ApiOperation({ summary: 'Get details for a specific review task' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.tasksService.findOne(id, req.user.atsUserId);
  }

  @Post(':id/feedback')
  @RequireModule('feedback', 'editor')
  @ApiOperation({ summary: 'Submit approve or reject feedback for a screening task' })
  async submitFeedback(
    @Request() req: any,
    @Param('id') id: string,
    @Body('action') action: 'approve' | 'reject',
    @Body('reason') reason: string,
  ) {
    return this.tasksService.submitFeedback(id, req.user.atsUserId, action, reason);
  }
}
