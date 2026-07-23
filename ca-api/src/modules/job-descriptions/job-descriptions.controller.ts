import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JobDescriptionsService } from './job-descriptions.service';
import { CreateJobDescriptionDto } from './dto/create-job-description.dto';
import { UpdateJobDescriptionDto } from './dto/update-job-description.dto';
import { UpdateJobDescriptionStatusDto } from './dto/update-job-description-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequireModule } from '../rbac/decorators/require-module.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Job Descriptions')
@ApiBearerAuth()
@Controller('job-descriptions')
@UseGuards(JwtAuthGuard, RbacGuard)
export class JobDescriptionsController {
  constructor(
    private readonly jobDescriptionsService: JobDescriptionsService,
  ) { }

  @Post()
  @RequireModule('job_descriptions', 'editor')
  create(
    @CurrentUser() user: any,
    @Body(new ValidationPipe({ whitelist: true }))
    createJobDescriptionDto: CreateJobDescriptionDto,
  ) {
    return this.jobDescriptionsService.create(
      user.atsUserId,
      createJobDescriptionDto,
    );
  }

  @Get()
  @RequireModule('job_descriptions', 'viewer')
  findAll(
    @Query('requisition_id') requisition_id?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.jobDescriptionsService.findAll({
      requisition_id,
      status,
      search,
    });
  }

  @Get('options/requisitions')
  @RequireModule('job_descriptions', 'editor')
  getRequisitionOptions() {
    return this.jobDescriptionsService.getRequisitionOptions();
  }

  @Get(':id')
  @RequireModule('job_descriptions', 'viewer')
  findOne(@Param('id') id: string) {
    return this.jobDescriptionsService.findOne(id);
  }

  @Patch(':id')
  @RequireModule('job_descriptions', 'editor')
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body(new ValidationPipe({ whitelist: true }))
    updateJobDescriptionDto: UpdateJobDescriptionDto,
  ) {
    return this.jobDescriptionsService.update(
      id,
      user.atsUserId,
      updateJobDescriptionDto,
    );
  }

  @Patch(':id/status')
  @RequireModule('job_descriptions', 'editor')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body(new ValidationPipe({ whitelist: true }))
    statusDto: UpdateJobDescriptionStatusDto,
  ) {
    return this.jobDescriptionsService.updateStatus(
      id,
      user.atsUserId,
      statusDto.status,
    );
  }

  @Delete(':id')
  @RequireModule('job_descriptions', 'administrator')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.jobDescriptionsService.remove(id, user.atsUserId);
  }

  //route for matching existing jds
  @Get(':id/find-matches')
  @RequireModule('job_descriptions', 'viewer')
  findMatches(
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.jobDescriptionsService.findMatchesForJob(id);
  }

  @Post(':id/rematch')
  @RequireModule('job_descriptions', 'editor')
  rematch(
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.jobDescriptionsService.rematchJob(id);
  }

  @Get(':id/stored-matches')
  @RequireModule('job_descriptions', 'viewer')
  findStoredMatches(
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.jobDescriptionsService.findStoredMatchesForJob(id);
  }
}
