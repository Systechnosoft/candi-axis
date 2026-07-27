import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  custom_api_key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  base_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;
}
