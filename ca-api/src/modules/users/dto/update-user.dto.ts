import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  full_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  role_code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  employee_code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  department?: string;

  @IsString()
  @IsOptional()
  org_id?: string;
}
