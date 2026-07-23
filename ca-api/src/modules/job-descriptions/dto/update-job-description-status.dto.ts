import { IsIn } from 'class-validator';

export class UpdateJobDescriptionStatusDto {
  @IsIn(['draft', 'open', 'on_hold', 'closed'])
  status: string;
}
