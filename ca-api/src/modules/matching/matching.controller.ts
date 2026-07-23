/**
 * File: ats-api/src/modules/matching/matching.controller.ts
 * Purpose: Implements the REST API endpoints for Job-Candidate matching,
 * calling the incremental matching logic and returning results.
 */

import { Controller, Get, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MatchingService } from './matching.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Matching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('job/:jobId')
  @ApiOperation({ summary: 'Find or fetch cached incremental matches for a specific Job Description' })
  async findMatches(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.matchingService.findMatches(jobId);
  }
}
