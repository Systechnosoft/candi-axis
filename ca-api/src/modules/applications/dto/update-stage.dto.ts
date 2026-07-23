import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const APPLICATION_STAGES = [
  'new',
  'screening',
  'interviewing',
  'shortlisted',
  'offered',
  'accepted',
  'joined',
  'rejected',
  'closed',
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export class UpdateStageDto {
  @ApiProperty({ enum: APPLICATION_STAGES })
  @IsNotEmpty()
  @IsIn(APPLICATION_STAGES)
  to_stage: ApplicationStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  offered_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  joining_date?: string;
}
