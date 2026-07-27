import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScheduleInterviewDto {
  @ApiProperty({ description: 'The application ID' })
  @IsUUID()
  @IsNotEmpty()
  applicationId: string;

  @ApiProperty({
    description: 'Round type (screening, tech1, tech2, manager, hr, other)',
  })
  @IsString()
  @IsNotEmpty()
  roundType: string;

  @ApiProperty({ description: 'Scheduled start date & time (UTC/ISO format)' })
  @IsDateString()
  @IsNotEmpty()
  scheduledStartUtc: string;

  @ApiProperty({ description: 'Duration in minutes', default: 60 })
  @IsInt()
  @IsOptional()
  durationMins?: number;

  @ApiProperty({ description: 'Mode (online, offline)', default: 'online' })
  @IsString()
  @IsOptional()
  mode?: string;

  @ApiProperty({ description: 'Offline location if applicable' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ description: 'Meeting link if online' })
  @IsString()
  @IsOptional()
  meetingLink?: string;

  @ApiProperty({ description: 'Array of interviewer user IDs' })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsNotEmpty()
  interviewerIds: string[];

  @ApiProperty({ description: 'Array of CC user IDs' })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  ccUserIds?: string[];

  @ApiProperty({ description: 'Customized Email Subject' })
  @IsString()
  @IsNotEmpty()
  emailSubject: string;

  @ApiProperty({
    description: 'Optional HR note rendered in both emails (Rich Text / HTML)',
  })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({ description: 'Pre-generated calendar event ID if applicable' })
  @IsString()
  @IsOptional()
  externalCalendarEventId?: string;
}
