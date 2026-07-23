import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsIn,
  MaxLength,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateRequisitionDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  department: string;

  @IsInt()
  @Min(1)
  openings_count: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority: string;

  @IsUUID()
  @IsNotEmpty()
  hiring_manager_id: string;

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
