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
} from '@nestjs/common';
import { JobPostingsService } from './job-postings.service';
import { CreateJobPostingDto } from './dto/create-job-posting.dto';
import { UpdateJobPostingDto } from './dto/update-job-posting.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequireModule } from '../rbac/decorators/require-module.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Job Postings')
@ApiBearerAuth()
@Controller('job-postings')
@UseGuards(JwtAuthGuard, RbacGuard)
export class JobPostingsController {
  constructor(private readonly jobPostingsService: JobPostingsService) {}

  @Post()
  @RequireModule('job_descriptions', 'editor')
  create(
    @CurrentUser() user: any,
    @Body(new ValidationPipe({ whitelist: true }))
    createJobPostingDto: CreateJobPostingDto,
  ) {
    return this.jobPostingsService.create(user.atsUserId, createJobPostingDto);
  }

  @Get()
  @RequireModule('job_descriptions', 'viewer')
  findAll(@Query('search') search?: string, @Query('jd_id') jd_id?: string) {
    return this.jobPostingsService.findAll({ search, jd_id });
  }

  @Get(':id')
  @RequireModule('job_descriptions', 'viewer')
  findOne(@Param('id') id: string) {
    return this.jobPostingsService.findOne(id);
  }

  @Patch(':id')
  @RequireModule('job_descriptions', 'editor')
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body(new ValidationPipe({ whitelist: true }))
    updateJobPostingDto: UpdateJobPostingDto,
  ) {
    return this.jobPostingsService.update(
      id,
      user.atsUserId,
      updateJobPostingDto,
    );
  }

  @Delete(':id')
  @RequireModule('job_descriptions', 'administrator')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.jobPostingsService.remove(id, user.atsUserId);
  }
}
