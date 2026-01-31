import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  avatarUrl?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  status: 'active' | 'inactive' | 'banned';
  createdAt: Date;
  updatedAt: Date;
}
