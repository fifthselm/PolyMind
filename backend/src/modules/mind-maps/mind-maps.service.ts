import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../../providers/llm/llm.service';
import { GenerateMindMapDto, MindMapLayout } from './dto/generate-mindmap.dto';
import { MermaidTemplates } from './mermaid-templates';

interface MindMapNode {
  id: string;
  text: string;
  children?: MindMapNode[];
}

interface MindMapResult {
  mermaidCode: string;
  topics: string[];
  layout: MindMapLayout;
}

@Injectable()
export class MindMapsService {
  private readonly logger = new Logger(MindMapsService.name);
  private readonly templates: MermaidTemplates;

  constructor(private readonly llmService: LLMService) {
    this.templates = new MermaidTemplates();
  }

  /**
   * 生成思维导图
   */
  async generateMindMap(dto: GenerateMindMapDto): Promise<MindMapResult> {
    const { messages, layout, title } = dto;

    // 1. 提取关键主题
    const topics = await this.extractTopics(messages, title);

    // 2. 构建节点树结构
    const nodeTree = this.buildNodeTree(topics, title);

    // 3. 生成 Mermaid 代码
    const mermaidCode = this.generateMermaidCode(nodeTree, layout);

    return {
      mermaidCode,
      topics: topics.map(t => t.name),
      layout,
    };
  }

  /**
   * 使用 LLM 提取关键主题
   */
  private async extractTopics(
    messages: string[],
    title?: string,
  ): Promise<Array<{ name: string; description?: string; subtopics?: string[] }>> {
    const combinedText = messages.join('\n');
    
    const systemPrompt = `你是一个思维导图生成助手。请从提供的对话内容中提取关键主题，并组织成层级结构。

要求：
1. 提取 5-10 个主要主题
2. 每个主题可以有 2-5 个子主题
3. 返回 JSON 数组格式
4. 只返回 JSON，不要其他说明文字

JSON 格式：
[
  {
    "name": "主题名称",
    "description": "简短描述（可选）",
    "subtopics": ["子主题1", "子主题2"]
  }
]`;

    const userPrompt = title 
      ? `对话标题: ${title}\n\n对话内容:\n${combinedText}`
      : `对话内容:\n${combinedText}`;

    try {
      const response = await this.llmService.sendMessage('default', {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        maxTokens: 2000,
      });

      const content = response.content.trim();
      
      // 尝试解析 JSON
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const topics = JSON.parse(jsonMatch[0]);
        if (Array.isArray(topics) && topics.length > 0) {
          return topics;
        }
      }

      // 如果解析失败，返回空数组
      this.logger.warn('无法解析主题 JSON，返回空数组');
      return [];

    } catch (error) {
      this.logger.error('提取主题失败:', error);
      throw new Error('提取主题失败');
    }
  }

  /**
   * 构建节点树结构
   */
  private buildNodeTree(
    topics: Array<{ name: string; description?: string; subtopics?: string[] }>,
    title?: string,
  ): MindMapNode {
    // 生成唯一的根节点 ID
    const rootId = this.generateId('root');
    
    const root: MindMapNode = {
      id: rootId,
      text: title || '思维导图',
      children: topics.map((topic, index) => {
        const nodeId = this.generateId(`topic-${index}`);
        return {
          id: nodeId,
          text: topic.name,
          children: topic.subtopics?.map((sub, subIndex) => ({
            id: this.generateId(`sub-${index}-${subIndex}`),
            text: sub,
          })) || [],
        };
      }),
    };

    return root;
  }

  /**
   * 根据布局生成 Mermaid 代码
   */
  private generateMermaidCode(node: MindMapNode, layout: MindMapLayout): string {
    switch (layout) {
      case 'mindmap':
        return this.templates.mindmap(node);
      case 'flowchart':
        return this.templates.flowchart(node);
      case 'timeline':
        return this.templates.timeline(node);
      default:
        return this.templates.mindmap(node);
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取支持的布局类型
   */
  getSupportedLayouts(): MindMapLayout[] {
    return ['mindmap', 'flowchart', 'timeline'];
  }
}
