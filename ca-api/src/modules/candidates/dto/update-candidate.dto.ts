import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CandidateEducationDto,
  CandidateEmploymentDto,
  CandidateCertificationDto,
  CandidateSocialLinkDto,
  CreateCandidateManualDto,
  CandidateProjectDto,
} from './create-candidate-manual.dto';

export class UpdateCandidateEducationDto extends CandidateEducationDto {
  @IsString()
  @IsOptional()
  id?: string;
}

export class UpdateCandidateEmploymentDto extends CandidateEmploymentDto {
  @IsString()
  @IsOptional()
  id?: string;
}

export class UpdateCandidateCertificationDto extends CandidateCertificationDto {
  @IsString()
  @IsOptional()
  id?: string;
}

export class UpdateCandidateSocialLinkDto extends CandidateSocialLinkDto {
  @IsString()
  @IsOptional()
  id?: string;
}

export class UpdateCandidateDto {
  @IsString()
  @IsOptional()
  full_name?: string;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString() // Was IsEmail, but we make optional things simple
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  secondary_email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  secondary_phone?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsOptional()
  total_exp_months?: number;

  @IsOptional()
  relevant_exp_months?: number;

  @IsString()
  @IsOptional()
  current_company?: string;

  @IsString()
  @IsOptional()
  current_designation?: string;

  @IsOptional()
  notice_period_days?: number;

  @IsOptional()
  current_ctc?: number;

  @IsOptional()
  expected_ctc?: number;

  @IsString()
  @IsOptional()
  profile_summary?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateCandidateEducationDto)
  educations?: UpdateCandidateEducationDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateCandidateEmploymentDto)
  employments?: UpdateCandidateEmploymentDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateCandidateCertificationDto)
  certifications?: UpdateCandidateCertificationDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateCandidateSocialLinkDto)
  social_links?: UpdateCandidateSocialLinkDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CandidateProjectDto)
  projects?: CandidateProjectDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsString()
  @IsOptional()
  gap_details?: string;
}

