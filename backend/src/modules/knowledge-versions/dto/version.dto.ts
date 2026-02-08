import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// 版本状态枚举
// ============================================
export enum VersionStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

// ============================================
// 创建版本 DTO
// ============================================
export class CreateVersionDto {
  @ApiProperty({ description: '知识库文档ID', example: 'doc-uuid-123' })
  @IsString()
  @IsNotEmpty()
  documentId: string;

  @ApiProperty({ description: '版本标题', example: 'Initial Draft' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: '版本描述', example: 'First version of the document' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '文档内容', example: '# Document Content\n\nThis is the content...' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: '变更摘要', example: 'Added new section about AI' })
  @IsString()
  @IsOptional()
  changeSummary?: string;

  @ApiPropertyOptional({ description: '版本标签', example: ['draft', 'review'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: '是否为自动保存', default: false })
  @IsOptional()
  isAutoSave?: boolean;
}

// ============================================
// 版本内容 DTO
// ============================================
export class VersionContentDto {
  @ApiProperty({ description: '内容块类型', example: 'paragraph' })
  @IsString()
  @IsNotEmpty()
  blockType: string;

  @ApiProperty({ description: '内容块数据', example: { text: 'Hello World', style: {} } })
  content: Record<string, any>;

  @ApiProperty({ description: '排序顺序', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  order: number;
}

// ============================================
// 创建带内容块的版本 DTO
// ============================================
export class CreateVersionWithBlocksDto {
  @ApiProperty({ description: '知识库文档ID', example: 'doc-uuid-123' })
  @IsString()
  @IsNotEmpty()
  documentId: string;

  @ApiProperty({ description: '版本标题', example: 'Updated Document' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: '版本描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '内容块列表', type: [VersionContentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VersionContentDto)
  blocks: VersionContentDto[];

  @ApiPropertyOptional({ description: '变更摘要' })
  @IsString()
  @IsOptional()
  changeSummary?: string;

  @ApiPropertyOptional({ description: '是否为自动保存', default: false })
  @IsOptional()
  isAutoSave?: boolean;
}

// ============================================
// 查询版本历史 DTO
// ============================================
export class GetVersionHistoryDto {
  @ApiProperty({ description: '知识库文档ID', example: 'doc-uuid-123' })
  @IsString()
  @IsNotEmpty()
  documentId: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsNumber()
  @Type()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsNumber()
  @Type()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: '版本状态过滤', enum: VersionStatus })
  @IsEnum(VersionStatus)
  @IsOptional()
  status?: VersionStatus;
}

// ============================================
// 比较版本 DTO
// ============================================
export class CompareVersionsDto {
  @ApiProperty({ description: '第一个版本ID', example: 'version-uuid-1' })
  @IsString()
  @IsNotEmpty()
  versionId1: string;

  @ApiProperty({ description: '第二个版本ID', example: 'version-uuid-2' })
  @IsString()
  @IsNotEmpty()
  versionId2: string;

  @ApiPropertyOptional({ description: '比较模式', enum: ['full', 'content', 'metadata'], default: 'full' })
  @IsString()
  @IsOptional()
  compareMode?: 'full' | 'content' | 'metadata' = 'full';
}

// ============================================
// 回滚版本 DTO
// ============================================
export class RollbackVersionDto {
  @ApiProperty({ description: '目标版本ID', example: 'version-uuid-old' })
  @IsString()
  @IsNotEmpty()
  targetVersionId: string;

  @ApiProperty({ description: '是否创建新版本而不是原地回滚', default: false })
  @IsOptional()
  createNew?: boolean = false;

  @ApiPropertyOptional({ description: '新版本标题', example: 'Reverted to v2' })
  @IsString()
  @IsOptional()
  newVersionTitle?: string;
}

// ============================================
// 自动保存 DTO
// ============================================
export class AutoSaveDto {
  @ApiProperty({ description: '知识库文档ID', example: 'doc-uuid-123' })
  @IsString()
  @IsNotEmpty()
  documentId: string;

  @ApiProperty({ description: '当前文档内容', example: 'Updated content...' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: '内容块列表', type: [VersionContentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VersionContentDto)
  @IsOptional()
  blocks?: VersionContentDto[];

  @ApiProperty({ description: '自动保存的唯一会话ID', example: 'autosave-session-123' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiPropertyOptional({ description: '是否强制创建新版本', default: false })
  @IsOptional()
  forceNew?: boolean;
}

// ============================================
// 版本响应 DTO
// ============================================
export class VersionResponse {
  id: string;
  documentId: string;
  versionNumber: number;
  title: string;
  description: string | null;
  changeSummary: string | null;
  status: VersionStatus;
  tags: string[];
  isAutoSave: boolean;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;

  // 关联数据
  content?: VersionContentResponse[];
  diff?: VersionDiffResponse;
  creator?: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

// ============================================
// 版本内容响应 DTO
// ============================================
export class VersionContentResponse {
  id: string;
  versionId: string;
  blockType: string;
  content: Record<string, any>;
  order: number;
  createdAt: Date;
}

// ============================================
// 版本列表响应 DTO
// ============================================
export class VersionListResponse {
  versions: VersionResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// 版本比较响应 DTO
// ============================================
export class VersionDiffResponse {
  version1: {
    id: string;
    versionNumber: number;
    title: string;
    createdAt: Date;
  };
  version2: {
    id: string;
    versionNumber: number;
    title: string;
    createdAt: Date;
  };
  contentDiff: {
    added: string[];
    removed: string[];
    modified: Array<{
      blockType: string;
      oldContent: Record<string, any>;
      newContent: Record<string, any>;
    }>;
  };
  metadataDiff: {
    changed: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
  };
  summary: string;
}

// ============================================
// 回滚响应 DTO
// ============================================
export class RollbackResponse {
  success: boolean;
  newVersionId: string;
  originalVersionId: string;
  message: string;
}

// ============================================
// 自动保存响应 DTO
// ============================================
export class AutoSaveResponse {
  success: boolean;
  versionId: string;
  isNewVersion: boolean;
  message: string;
}

// ============================================
// 批量操作 DTO
// ============================================
export class BulkVersionActionDto {
  @ApiProperty({ description: '版本ID列表', example: ['version-uuid-1', 'version-uuid-2'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  versionIds: string[];

  @ApiProperty({ description: '操作类型', enum: ['archive', 'restore', 'delete'] })
  @IsEnum(['archive', 'restore', 'delete'])
  action: 'archive' | 'restore' | 'delete';
}
