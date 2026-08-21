import { IsString, IsOptional, IsIn, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAiKeyDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  key!: string;

  @IsOptional()
  @IsBoolean()
  isNew?: boolean;

  @IsOptional()
  @IsString()
  status?: 'active' | 'rate_limited' | 'quota_exhausted' | 'invalid' | 'disabled';
}

export class UpdateAiConfigDto {
  @ApiProperty({
    enum: [
      'gemini',
      'openai',
      'anthropic',
      'openrouter',
      'groq',
      'xai',
      'grok',
    ],
  })
  @IsString()
  @IsIn(['gemini', 'openai', 'anthropic', 'openrouter', 'groq', 'xai', 'grok'])
  provider!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  custom_api_key?: string; // Legacy

  @ApiPropertyOptional({ type: () => [UpdateAiKeyDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateAiKeyDto)
  keys?: UpdateAiKeyDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  base_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;
}
