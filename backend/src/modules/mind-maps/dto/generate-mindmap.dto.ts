import { IsString, IsArray, IsOptional, IsEnum } from 'class-validator';

export class GenerateMindMapDto {
  @IsString()
  title: string;

  @IsArray()
  messages: Array<{ role: string; content: string }>;

  @IsOptional()
  @IsEnum(['mindmap', 'flowchart', 'timeline', 'tree'])
  layout?: 'mindmap' | 'flowchart' | 'timeline' | 'tree';

  @IsOptional()
  depth?: number;
}

export type MindMapLayout = 'mindmap' | 'flowchart' | 'timeline' | 'tree';
