import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';

export class CreateScenarioDto {
  @IsString()
  name: string;

  @IsString()
  role: string;

  @IsString()
  description: string;

  @IsString()
  systemPrompt: string;

  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced', 'expert'])
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
