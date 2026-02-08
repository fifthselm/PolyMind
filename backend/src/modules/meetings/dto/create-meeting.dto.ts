import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMeetingDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsArray()
  @IsOptional()
  participants?: string[];

  @IsString()
  @IsOptional()
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export class UpdateMeetingDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsArray()
  @IsOptional()
  participants?: string[];

  @IsEnum(['scheduled', 'in_progress', 'completed', 'cancelled'])
  @IsOptional()
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export class AddTranscriptDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsString()
  @IsOptional()
  speaker?: string;

  @IsDateString()
  @IsOptional()
  timestamp?: string;
}

export class GenerateSummaryDto {
  @IsString()
  @IsOptional()
  summaryType?: 'brief' | 'detailed' | 'executive';

  @IsArray()
  @IsOptional()
  keyTopics?: string[];
}

export class ExtractActionItemsDto {
  @IsString()
  @IsOptional()
  priority?: 'high' | 'medium' | 'low';
}
