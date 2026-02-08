import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class CreateMeetingDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  roomId?: string;

  @IsNumber()
  @IsOptional()
  maxParticipants?: number;
}

export class GenerateSummaryDto {
  @IsString()
  meetingId: string;

  @IsString()
  @IsOptional()
  type?: 'executive' | 'detailed' | 'action_items';

  @IsArray()
  @IsOptional()
  transcript?: Array<{
    speaker: string;
    content: string;
    timestamp: number;
  }>;
}

export class ExtractActionItemsDto {
  @IsString()
  meetingId: string;

  @IsArray()
  @IsOptional()
  transcript?: Array<{
    speaker: string;
    content: string;
  }>;
}
