import {
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  IsIn,
  IsInt,
  Min,
} from 'class-validator';

export class CreateJobDescriptionDto {
  @IsOptional()
  @IsUUID()
  requisition_id?: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  location?: string;

  @IsOptional()
  @IsIn(['onsite', 'remote', 'hybrid'])
  work_mode?: string;

  @IsOptional()
  @IsIn(['full_time', 'part_time', 'contract', 'internship'])
  employment_type?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  exp_min_months?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  exp_max_months?: number;

  @IsOptional()
  @IsString()
  must_have_text?: string;

  @IsOptional()
  @IsString()
  nice_to_have_text?: string;

  @IsOptional()
  @IsString()
  job_summary?: string;

  @IsOptional()
  @IsString()
  responsibilities_text?: string;

  @IsOptional()
  @IsIn(['draft', 'open', 'on_hold', 'closed'])
  status?: string;

  @IsOptional()
  @IsUUID()
  owner_user_id?: string;
}
