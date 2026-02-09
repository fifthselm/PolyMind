import { IsString, IsUUID, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';

export class CreateDebateDto {
  @IsUUID()
  userId: string; // 添加 userId 字段

  @IsString()
  topic: string; // 辩论主题

  @IsUUID()
  aiModelIdA: string; // 正方AI

  @IsUUID()
  aiModelIdB: string; // 反方AI

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['free', 'structured'])
  format: 'free' | 'structured' = 'structured';

  @IsNumber()
  @Min(1)
  @Max(10)
  maxRounds: number = 3;
}

export class ScoreDebateDto {
  @IsUUID()
  debateId: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(10)
  scoreA: number; // 正方分数

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(10)
  scoreB: number; // 反方分数

  @IsString()
  @IsOptional()
  comment?: string;
}

export class NextRoundDto {
  @IsUUID()
  debateId: string;
}
