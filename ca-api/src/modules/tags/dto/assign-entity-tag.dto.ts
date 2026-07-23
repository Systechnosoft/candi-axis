import {
  IsUUID,
  IsString,
  IsIn,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class AssignEntityTagDto {
  @IsUUID()
  tagId: string;

  @IsString()
  @IsOptional()
  @IsIn(['manual', 'parser', 'ai'])
  source?: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  confidence?: number;

  @IsBoolean()
  @IsOptional()
  is_starred?: boolean;
}
