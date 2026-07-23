import {
  IsString,
  IsOptional,
  IsIn,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export class UpdateTagDto {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @IsString()
  @IsOptional()
  @IsIn(['skill', 'domain', 'level', 'location', 'other'])
  type?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
