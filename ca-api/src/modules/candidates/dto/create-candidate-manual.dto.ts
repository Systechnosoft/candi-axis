import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsNumber,
  Min,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CandidateEducationDto {
  @IsString()
  @IsOptional()
  qualification_level?: string;

  @IsString()
  @IsOptional()
  degree?: string;

  @IsString()
  @IsOptional()
  field_of_study?: string;

  @IsString()
  @IsOptional()
  institution_name?: string;

  @IsOptional()
  start_year?: string | number;

  @IsOptional()
  end_year?: string | number;

  @IsString()
  @IsOptional()
  grade_or_percentage?: string;

  @IsBoolean()
  @IsOptional()
  is_highest?: boolean;
}

export class CandidateEmploymentDto {
  @IsString()
  @IsNotEmpty()
  company_name: string;

  @IsString()
  @IsOptional()
  job_title?: string;

  @IsString()
  @IsOptional()
  employment_type?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  start_date?: string;

  @IsString()
  @IsOptional()
  end_date?: string;

  @IsBoolean()
  @IsOptional()
  is_current?: boolean;

  @IsString()
  @IsOptional()
  responsibilities_summary?: string;
}

export class CandidateCertificationDto {
  @IsString()
  @IsNotEmpty()
  certification_name: string;

  @IsString()
  @IsOptional()
  issuer?: string;

  @IsString()
  @IsOptional()
  issued_on?: string;

  @IsString()
  @IsOptional()
  expiry_on?: string;

  @IsBoolean()
  @IsOptional()
  does_not_expire?: boolean;

  @IsString()
  @IsOptional()
  credential_id?: string;

  @IsString()
  @IsOptional()
  credential_url?: string;
}

export class CandidateSocialLinkDto {
  @IsString()
  @IsNotEmpty()
  link_type: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  display_label?: string;

  @IsBoolean()
  @IsOptional()
  is_primary?: boolean;
}

export class CreateCandidateManualDto {
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEmail()
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

  @IsNumber()
  @Min(0)
  @IsOptional()
  total_exp_months?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  relevant_exp_months?: number;

  @IsString()
  @IsOptional()
  current_company?: string;

  @IsString()
  @IsOptional()
  current_designation?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  notice_period_days?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  current_ctc?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  expected_ctc?: number;

  @IsString()
  @IsOptional()
  profile_summary?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  gap_details?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CandidateEducationDto)
  educations?: CandidateEducationDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CandidateEmploymentDto)
  employments?: CandidateEmploymentDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CandidateCertificationDto)
  certifications?: CandidateCertificationDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CandidateSocialLinkDto)
  social_links?: CandidateSocialLinkDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CandidateProjectDto)
  projects?: CandidateProjectDto[];

  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}


export class CandidateProjectDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  technologies?: string;

  @IsString()
  @IsOptional()
  duration?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  project_url?: string;
}
