import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCandidateManualDto } from './create-candidate-manual.dto';

export class CreateCandidateParsedDto {
  @IsString()
  @IsNotEmpty()
  document_id: string;

  @IsObject()
  @IsNotEmpty()
  parsed_json: Record<string, unknown>;

  @IsString()
  @IsOptional()
  parsed_text?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCandidateManualDto)
  candidate_data?: CreateCandidateManualDto;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
