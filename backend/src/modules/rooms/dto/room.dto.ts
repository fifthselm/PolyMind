import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoomDto {
  @IsString()
  @Min(1)
  @Max(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(2)
  @Max(100)
  maxMembers?: number;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @Min(1)
  @Max(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(2)
  @Max(100)
  maxMembers?: number;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsEnum(['active', 'archived', 'deleted'])
  status?: 'active' | 'archived' | 'deleted';
}

export class AddMemberDto {
  @IsEnum(['human', 'ai'])
  memberType: 'human' | 'ai';

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  aiModelId?: string;

  @IsOptional()
  @IsEnum(['owner', 'admin', 'member'])
  role?: 'owner' | 'admin' | 'member';
}

export interface MemberResponse {
  id: string;
  roomId: string;
  userId?: string;
  aiModelId?: string;
  memberType: 'human' | 'ai';
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
  user?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  aiModel?: {
    id: string;
    displayName: string;
    provider: string;
  };
}

export interface RoomResponse {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  maxMembers: number;
  isPrivate: boolean;
  status: 'active' | 'archived' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
  members?: MemberResponse[];
}
