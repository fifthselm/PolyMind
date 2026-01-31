import { IsString, IsOptional, IsEnum, IsArray, IsNumber, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class SendMessageDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(['text', 'image', 'file'])
  contentType?: 'text' | 'image' | 'file';

  @IsOptional()
  @IsString()
  replyToId?: string;

  @IsOptional()
  @IsArray()
  mentions?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class PaginationQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

export interface MessageResponse {
  id: string;
  roomId: string;
  senderType: 'human' | 'ai';
  senderUserId?: string;
  senderAiModelId?: string;
  content: string;
  contentType: 'text' | 'image' | 'file';
  replyToId?: string;
  mentions: string[];
  metadata?: Record<string, any>;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  sender?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  replyTo?: {
    id: string;
    content: string;
    senderUserId?: string;
  };
}
