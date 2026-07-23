import {
  IsString,
  IsNotEmpty,
  IsIn,
  MaxLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateTagDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['skill', 'domain', 'level', 'location', 'other'])
  type: string;

  @IsString()
  @IsOptional()
  description?: string;
}
