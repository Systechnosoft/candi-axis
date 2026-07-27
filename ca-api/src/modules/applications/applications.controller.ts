import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { ApplicationStageService } from './application-stage.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequireModule } from '../rbac/decorators/require-module.decorator';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly stageService: ApplicationStageService,
  ) {}

  @Post()
  @RequireModule('candidates', 'editor')
  @ApiOperation({ summary: 'Create a new application' })
  async create(@Request() req: any, @Body() dto: CreateApplicationDto) {
    return this.applicationsService.create(req.user.atsUserId, dto);
  }

  @Get()
  @RequireModule('candidates', 'viewer')
  @ApiOperation({ summary: 'List all applications with filters' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('stage') stage?: string,
    @Query('jd_id') jd_id?: string,
    @Query('candidate_id') candidate_id?: string,
    @Query('recruiter_id') recruiter_id?: string,
    @Query('search') search?: string,
  ) {
    return this.applicationsService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      stage,
      jd_id,
      candidate_id,
      recruiter_id,
      search,
    });
  }

  @Get(':id')
  @RequireModule('candidates', 'viewer')
  @ApiOperation({ summary: 'Get application details' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.findOne(id);
  }

  @Patch(':id/stage')
  @RequireModule('candidates', 'editor')
  @ApiOperation({ summary: 'Update application stage' })
  async updateStage(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.stageService.updateStage(
      id,
      req.user.atsUserId,
      dto.to_stage,
      dto.reason,
      dto.notes,
      dto.offered_amount,
      dto.joining_date,
    );
  }

  @Post(':id/refresh-ai-rating')
  @RequireModule('candidates', 'editor')
  @ApiOperation({ summary: 'Refresh AI Rating for application' })
  async refreshAiRating(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.applicationsService.refreshAiRating(req.user.atsUserId, id);
  }
}
