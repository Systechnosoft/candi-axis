import {
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  IsBoolean,
  ArrayNotEmpty,
} from 'class-validator';

export class CreateJobPostingDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  jd_id: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ArrayNotEmpty()
  @IsUUID(undefined, { each: true })
  hr_ids: string[];

  @ArrayNotEmpty()
  @IsUUID(undefined, { each: true })
  interviewer_ids: string[];
}
