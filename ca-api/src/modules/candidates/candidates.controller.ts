import {
  Controller,
  Post,
  Put,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { CreateCandidateManualDto } from './dto/create-candidate-manual.dto';
import { CreateCandidateParsedDto } from './dto/create-candidate-parsed.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequireModule } from '../rbac/decorators/require-module.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('candidates')
@UseGuards(JwtAuthGuard, RbacGuard)
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post('manual')
  @RequireModule('candidates', 'editor')
  createManual(
    @CurrentUser() user: any,
    @Body(new ValidationPipe({ whitelist: true }))
    dto: CreateCandidateManualDto,
  ) {
    return this.candidatesService.createManual(user.atsUserId, user.email, dto);
  }

  @Post('parsed')
  @RequireModule('candidates', 'editor')
  createParsed(
    @CurrentUser() user: any,
    @Body(new ValidationPipe({ whitelist: true }))
    dto: CreateCandidateParsedDto,
  ) {
    return this.candidatesService.createParsed(user.atsUserId, user.email, dto);
  }

  @Get()
  @RequireModule('candidates', 'viewer')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('stage') stage?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.candidatesService.findAll(pageNum, limitNum, search, stage);
  }

  @Get(':id')
  @RequireModule('candidates', 'viewer')
  findOne(@Param('id') id: string) {
    return this.candidatesService.findOne(id);
  }

  @Put(':id')
  @RequireModule('candidates', 'editor')
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body(new ValidationPipe({ whitelist: true }))
    dto: UpdateCandidateDto,
  ) {
    return this.candidatesService.update(id, user.atsUserId, user.email, dto);
  }
}
