import { IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAIModelDto {
  @IsEnum(['openai', 'claude', 'gemini', 'qwen', 'wenxin', 'glm', 'kimi', 'custom'])
  provider: 'openai' | 'claude' | 'gemini' | 'qwen' | 'wenxin' | 'glm' | 'kimi' | 'custom';

  @IsString()
  modelName: string;

  @IsString()
  displayName: string;

  @IsOptional()
  @IsString()
  apiEndpoint?: string;

  @IsString()
  apiKey: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(32768)
  maxTokens?: number;
}

export class UpdateAIModelDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  apiEndpoint?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(32768)
  maxTokens?: number;

  @IsOptional()
  isActive?: boolean;
}

export interface AIModelResponse {
  id: string;
  provider: string;
  modelName: string;
  displayName: string;
  apiEndpoint?: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;
}
