import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsIn,
} from 'class-validator';

export class RegisterDocumentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['resume', 'cover_letter', 'other'])
  document_type: string;

  @IsString()
  @IsNotEmpty()
  original_file_name: string;

  @IsString()
  @IsNotEmpty()
  storage_bucket: string;

  @IsString()
  @IsNotEmpty()
  storage_key: string;

  @IsString()
  @IsNotEmpty()
  mime_type: string;

  @IsNumber()
  @IsOptional()
  file_size_bytes?: number;

  @IsString()
  @IsOptional()
  file_hash?: string;
}
