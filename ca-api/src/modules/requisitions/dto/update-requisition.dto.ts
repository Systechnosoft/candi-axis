import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsIn,
  MaxLength,
  IsUUID,
} from 'class-validator';

export class UpdateRequisitionDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  department?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  openings_count?: number;

  @IsString()
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority?: string;

  @IsUUID()
  @IsOptional()
  hiring_manager_id?: string;

  @IsUUID()
  @IsOptional()
  owner_user_id?: string;

  @IsString()
  @IsOptional()
  @IsIn(['draft', 'open', 'on_hold', 'closed'])
  status?: string;

  @IsString()
  @IsOptional()
  status_reason?: string;
}
