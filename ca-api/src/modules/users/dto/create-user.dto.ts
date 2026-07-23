import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(320)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  full_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  role_code: string;

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

  @IsString()
  @IsOptional()
  status?: 'active' | 'inactive';
}
