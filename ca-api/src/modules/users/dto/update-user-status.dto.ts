import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateUserStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: 'active' | 'inactive';
}
