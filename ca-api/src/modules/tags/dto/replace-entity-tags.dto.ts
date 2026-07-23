import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { AssignEntityTagDto } from './assign-entity-tag.dto';

export class ReplaceEntityTagsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignEntityTagDto)
  tags: AssignEntityTagDto[];
}
