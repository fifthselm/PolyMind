import { IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAIModelDto {
  @IsEnum(['openai', 'claude', 'gemini', 'qwen', 'wenxin', 'glm', 'kimi', 'deepseek', 'custom'])
  provider: 'openai' | 'claude' | 'gemini' | 'qwen' | 'wenxin' | 'glm' | 'kimi' | 'deepseek' | 'custom';

  @IsString()
  modelName: string;

  @IsString()
  displayName: string;

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
}

export class UpdateAIModelDto {
  @IsOptional()
  @IsString()
  modelName?: string;

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

export class GetAvailableModelsDto {
  @IsEnum(['openai', 'claude', 'gemini', 'qwen', 'wenxin', 'glm', 'kimi', 'deepseek', 'custom'])
  provider: 'openai' | 'claude' | 'gemini' | 'qwen' | 'wenxin' | 'glm' | 'kimi' | 'deepseek' | 'custom';

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  apiEndpoint?: string;
}

export class TestAndSaveModelDto {
  @IsEnum(['openai', 'claude', 'gemini', 'qwen', 'wenxin', 'glm', 'kimi', 'deepseek', 'custom'])
  provider: 'openai' | 'claude' | 'gemini' | 'qwen' | 'wenxin' | 'glm' | 'kimi' | 'deepseek' | 'custom';

  @IsString()
  modelName: string;

  @IsString()
  displayName: string;

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
  @IsString()
  id?: string; // 如果提供则更新，否则创建
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
