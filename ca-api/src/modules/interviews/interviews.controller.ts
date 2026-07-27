import {
  Controller,
  Get,
  Post,
  UseGuards,
  Query,
  Body,
  Request,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InterviewsService } from './interviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequireModule } from '../rbac/decorators/require-module.decorator';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';

@ApiTags('Interviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get()
  @RequireModule('interviews', 'viewer')
  @ApiOperation({
    summary: 'List all interviews and candidates in interviewing stage',
  })
  async findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.interviewsService.findAll({ status, search });
  }

  @Post()
  @RequireModule('interviews', 'editor')
  @ApiOperation({
    summary:
      'Schedule an interview, assign interviewers, update sub-stage, and send emails',
  })
  async scheduleInterview(
    @Request() req: any,
    @Body() dto: ScheduleInterviewDto,
  ) {
    return this.interviewsService.scheduleInterview(req.user.atsUserId, dto);
  }

  @Post(':id/create-google-meet-invite')
  @RequireModule('interviews', 'editor')
  @ApiOperation({
    summary: 'Create Google Meet invite for interview via Google Calendar API',
  })
  async createGoogleMeetInvite(@Request() req: any, @Param('id') id: string) {
    return this.interviewsService.createGoogleMeetInvite(
      id,
      req.user.atsUserId,
    );
  }
}
