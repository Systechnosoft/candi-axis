import {
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  IsBoolean,
  ArrayNotEmpty,
} from 'class-validator';

export class UpdateJobPostingDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  jd_id?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @ArrayNotEmpty()
  @IsUUID(undefined, { each: true })
  hr_ids?: string[];

  @IsOptional()
  @ArrayNotEmpty()
  @IsUUID(undefined, { each: true })
  interviewer_ids?: string[];
}
