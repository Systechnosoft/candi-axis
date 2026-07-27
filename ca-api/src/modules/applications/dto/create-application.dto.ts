import { IsNotEmpty, IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApplicationDto {
  @ApiProperty({ description: 'UUID of the candidate' })
  @IsNotEmpty()
  @IsUUID()
  candidate_id: string;

  @ApiProperty({ description: 'UUID of the job description' })
  @IsNotEmpty()
  @IsUUID()
  jd_id: string;

  @ApiPropertyOptional({
    description: 'Source of the application',
    default: 'manual',
  })
  @IsOptional()
  @IsString()
  source?: string;
}
