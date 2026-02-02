import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma.service';
import { LLMService } from '../../providers/llm/llm.service';
import { GatewayGateway } from '../websocket/gateway.gateway';
import { WebSearchService } from '../web-search/web-search.service';
import { LLMMessage, StreamingCallbacks } from '../../providers/llm/base/types';

// 类型定义 - 替换 any 类型
interface ChatContext {
  roomId: string;
  aiModelId: string;
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
}

interface RoomMemberWithAI {
  id: string;
  roomId: string;
  userId?: string | null;
  aiModelId?: string | null;
  memberType: 'human' | 'ai';
  role: 'owner' | 'admin' | 'member';
  aiPrompt?: string | null;
  joinedAt: Date;
  aiModel?: {
    id: string;
    provider: string;
    modelName: string;
    displayName: string;
    apiEndpoint?: string | null;
    apiKeyEncrypted?: string | null;
    systemPrompt?: string | null;
    temperature: number;
    maxTokens: number;
  } | null;
}

interface MessageWithSender {
  id: string;
  senderType: 'human' | 'ai';
  content: string;
}

interface ContextMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 流式生成会话管理
interface StreamingSession {
  abortController: AbortController;
  messageId: string;
  aiModelId: string;
  roomId: string;
  startTime: Date;
  accumulatedContent: string;
}

@Injectable()
export class AIChatService {
  private readonly logger = new Logger(AIChatService.name);

  // 最大上下文消息数
  private readonly MAX_CONTEXT_MESSAGES = 20;

  // Token限制（保守估计）
  private readonly MAX_TOKENS = 8000;

  // 活跃的流式会话映射
  private activeStreamingSessions = new Map<string, StreamingSession>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LLMService,
    private readonly gateway: GatewayGateway,
    private readonly webSearchService: WebSearchService,
  ) {}

  /**
   * 中断指定的流式生成
   */
  async abortStreaming(messageId: string, roomId: string): Promise<boolean> {
    const session = this.activeStreamingSessions.get(messageId);
    
    if (!session) {
      this.logger.warn(`未找到流式会话: ${messageId}`);
      return false;
    }

    // 中止生成
    session.abortController.abort();
    
    // 更新数据库中的消息
    await this.prisma.message.update({
      where: { id: messageId },
      data: { 
        content: session.accumulatedContent + '\n\n[已中断生成]',
      },
    });

    // 广播中断事件
    this.gateway.server.to(roomId).emit('message:ai:aborted', {
      messageId,
      aiModelId: session.aiModelId,
      content: session.accumulatedContent,
    });

    // 清理会话
    this.activeStreamingSessions.delete(messageId);
    
    this.logger.log(`已中断流式生成: ${messageId}`);
    return true;
  }

  /**
   * 获取活跃的流式会话列表
   */
  getActiveStreamingSessions(roomId?: string): StreamingSession[] {
    const sessions = Array.from(this.activeStreamingSessions.values());
    if (roomId) {
      return sessions.filter(s => s.roomId === roomId);
    }
    return sessions;
  }

  /**
   * 处理AI聊天请求
   */
  async processAIChat(
    roomId: string,
    userMessage: string,
    userId: string,
    mentions: string[] = [],
    mode: 'normal' | 'search' | 'deep_think' = 'normal',
  ): Promise<void> {
    // 获取房间内的所有AI模型
    const aiMembers = await this.prisma.roomMember.findMany({
      where: {
        roomId,
        memberType: 'ai',
      },
      include: {
        aiModel: true,
      },
    });

    // 过滤出需要响应的AI成员
    let targetMembers = aiMembers;
    
    if (mentions.length > 0) {
      // 如果用户@了特定成员，只让被@的AI响应
      targetMembers = aiMembers.filter((member: RoomMemberWithAI) => 
        mentions.includes(member.id)
      );
      this.logger.log(`用户@了特定AI，只响应: ${targetMembers.map(m => m.aiModel?.displayName).join(', ')}`);
    } else {
      // 如果没有@任何AI，所有AI都不响应（避免插嘴）
      // 或者可以选择让一个默认AI响应
      this.logger.log('用户没有@任何AI，所有AI保持沉默');
      return;
    }

    // 并行调用目标AI模型
    const promises = targetMembers.map(async (member: RoomMemberWithAI) => {
      if (member.aiModel) {
        await this.processSingleAI(
          roomId,
          member.aiModel,
          userMessage,
          userId,
          mentions,
          member.aiPrompt ?? undefined,
          mode,
        );
      }
    });

    await Promise.all(promises);
  }

  /**
   * 处理单个AI模型的响应
   */
  async processSingleAI(
    roomId: string,
    aiModel: RoomMemberWithAI['aiModel'],
    userMessage: string,
    userId: string,
    mentions: string[] = [],
    memberPrompt?: string,
    mode: 'normal' | 'search' | 'deep_think' = 'normal',
  ): Promise<void> {
    if (!aiModel) {
      this.logger.error('AI模型不存在');
      return;
    }

    try {
      // 获取对话上下文
      const combinedPrompt = [aiModel.systemPrompt, memberPrompt].filter(Boolean).join('\n\n');
      const context = await this.getContext(roomId, aiModel.id, combinedPrompt || undefined);

      // 构建消息（映射角色：human -> user, ai -> assistant）
      const messages: LLMMessage[] = context.messages.map((msg: ContextMessage) => {
        const roleMap: Record<string, 'system' | 'user' | 'assistant'> = {
          'system': 'system',
          'human': 'user',
          'ai': 'assistant',
          'user': 'user',
          'assistant': 'assistant',
        };
        return {
          role: roleMap[msg.role] || 'user',
          content: msg.content,
        };
      });

      // 如果有system prompt，添加为第一条消息
      if (context.systemPrompt) {
        messages.unshift({
          role: 'system',
          content: context.systemPrompt,
        });
      }

      // 根据模式决定是否启用联网搜索
      let finalUserMessage = userMessage;
      
      if (mode === 'search') {
        this.logger.log(`[搜索模式] 启用联网搜索: ${userMessage.substring(0, 50)}...`);
        
        // 执行网络搜索
        const searchResults = await this.webSearchService.search(userMessage, 5);
        
        if (searchResults.length > 0) {
          // 构建带搜索结果的prompt
          finalUserMessage = this.webSearchService.buildSearchPrompt(userMessage, searchResults);
          this.logger.log(`搜索结果已整合到prompt，共${searchResults.length}条结果`);
        } else {
          this.logger.warn('联网搜索未返回结果，使用原始消息');
        }
      } else if (mode === 'deep_think') {
        this.logger.log(`[深度思考模式] 启用深度推理: ${userMessage.substring(0, 50)}...`);
        // 在system prompt中添加深度思考指令
        messages.unshift({
          role: 'system',
          content: '你是一个深度思考助手。请仔细分析问题，提供深入、全面的回答。在回答之前，请先列出你的思考过程。',
        });
      }
      
      // 添加用户消息（可能是增强后的带搜索结果的消息）
      messages.push({ role: 'user', content: finalUserMessage });

      // 创建AI消息（初始状态）
      const aiMessage = await this.prisma.message.create({
        data: {
          roomId,
          senderType: 'ai',
          senderAiModelId: aiModel.id,
          content: '',
          mentions,
        },
        include: {
          senderAiModel: true,
        },
      });

      // 创建 AbortController 用于中断控制
      const abortController = new AbortController();

      // 创建流式会话
      const streamingSession: StreamingSession = {
        abortController,
        messageId: aiMessage.id,
        aiModelId: aiModel.id,
        roomId,
        startTime: new Date(),
        accumulatedContent: '',
      };

      // 注册活跃会话
      this.activeStreamingSessions.set(aiMessage.id, streamingSession);

      // 广播流式开始事件
      this.gateway.server.to(roomId).emit('message:ai:stream:start', {
        messageId: aiMessage.id,
        aiModelId: aiModel.id,
        aiModelName: aiModel.displayName,
        timestamp: Date.now(),
      });

      // 流式调用AI
      const callbacks: StreamingCallbacks = {
        onChunk: (chunk) => {
          // 检查是否已中断
          if (abortController.signal.aborted) {
            return;
          }

          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            // 累加内容
            streamingSession.accumulatedContent += content;
            
            // 增量更新消息
            this.gateway.server.to(roomId).emit('message:ai:stream:chunk', {
              messageId: aiMessage.id,
              aiModelId: aiModel.id,
              chunk: content,
              accumulatedContent: streamingSession.accumulatedContent,
              timestamp: Date.now(),
            });
          }
        },
        onComplete: async (fullContent) => {
          // 清理会话
          this.activeStreamingSessions.delete(aiMessage.id);

          // 更新消息内容
          await this.prisma.message.update({
            where: { id: aiMessage.id },
            data: { content: fullContent },
          });

          // 广播完成事件
          this.gateway.server.to(roomId).emit('message:ai:stream:end', {
            messageId: aiMessage.id,
            aiModelId: aiModel.id,
            content: fullContent,
            timestamp: Date.now(),
            duration: Date.now() - streamingSession.startTime.getTime(),
          });

          // 保存上下文
          await this.saveContext(roomId, aiModel.id, messages, fullContent);

          // 检查AI响应中是否包含@提及（AI协作模式）
          await this.processAIResponseMentions(
            roomId,
            aiModel,
            fullContent,
            aiMessage.id,
          );
        },
        onError: async (error) => {
          // 清理会话
          this.activeStreamingSessions.delete(aiMessage.id);

          this.logger.error(`AI响应错误: ${error.message}`);

          // 检查是否是中断导致的错误
          if (abortController.signal.aborted) {
            this.logger.log(`流式生成被中断: ${aiMessage.id}`);
            return;
          }

          // 更新消息为错误状态
          await this.prisma.message.update({
            where: { id: aiMessage.id },
            data: { content: '抱歉，我遇到了一些问题。' },
          });

          // 广播错误事件
          this.gateway.server.to(roomId).emit('message:ai:stream:error', {
            messageId: aiMessage.id,
            aiModelId: aiModel.id,
            error: error.message,
            timestamp: Date.now(),
          });
        },
      };

      // 验证API Key不能为空
      if (!aiModel.apiKeyEncrypted || aiModel.apiKeyEncrypted.trim() === '') {
        throw new Error(`模型"${aiModel.displayName}"的API Key为空，请检查模型配置`);
      }

      // 验证模型名称
      if (!aiModel.modelName || aiModel.modelName.trim() === '') {
        throw new Error(`模型"${aiModel.displayName}"的模型名称为空，请检查模型配置`);
      }

      // 准备API配置，确保endpoint格式正确
      let apiEndpoint = aiModel.apiEndpoint || undefined;
      if (apiEndpoint && aiModel.provider.toLowerCase() === 'openai') {
        // 确保OpenAI端点以/v1结尾
        if (!apiEndpoint.endsWith('/v1')) {
          apiEndpoint = apiEndpoint.replace(/\/+$/, '') + '/v1';
          this.logger.warn(`自动修正API Endpoint格式: ${aiModel.apiEndpoint} -> ${apiEndpoint}`);
        }
      }

      await this.llmService.streamMessageWithConfig(
        aiModel.provider,
        {
          model: aiModel.modelName,
          messages,
          temperature: aiModel.temperature,
          maxTokens: aiModel.maxTokens,
          signal: abortController.signal, // 传递中断信号
        },
        callbacks,
        {
          apiKey: aiModel.apiKeyEncrypted,
          apiEndpoint: apiEndpoint,
        }
      );

    } catch (error) {
      // 清理会话（如果存在）
      const sessionKeys = Array.from(this.activeStreamingSessions.keys());
      for (const key of sessionKeys) {
        const session = this.activeStreamingSessions.get(key);
        if (session?.aiModelId === aiModel?.id && session?.roomId === roomId) {
          this.activeStreamingSessions.delete(key);
        }
      }

      // 详细记录错误信息
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(`AI聊天处理失败: ${errorMessage}`, {
        roomId,
        aiModelId: aiModel?.id,
        aiModelName: aiModel?.displayName,
        userId,
        error: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString(),
      });

      // 抛出更详细的错误
      throw new Error(`AI响应失败: ${errorMessage}`);
    }
  }

  /**
   * 获取对话上下文
   */
  private async getContext(
    roomId: string,
    aiModelId: string,
    systemPrompt?: string,
  ): Promise<ChatContext> {
    // 先尝试从数据库获取保存的上下文
    let savedContext = await this.prisma.aiConversationContext.findUnique({
      where: {
        roomId_aiModelId: { roomId, aiModelId },
      },
    });

    let messages: Array<{ role: string; content: string }> = [];

    if (savedContext) {
      // 安全解析 contextMessages
      const contextMessages = savedContext.contextMessages;
      if (Array.isArray(contextMessages)) {
        messages = contextMessages.map((msg: unknown) => {
          if (msg && typeof msg === 'object' && 'role' in msg && 'content' in msg) {
            return { role: String(msg.role), content: String(msg.content) };
          }
          return { role: 'user', content: String(msg) };
        });
      }
    } else {
      // 获取最近的对话历史
      const recentMessages = await this.prisma.message.findMany({
        where: {
          roomId,
          isDeleted: false,
          senderType: { in: ['human', 'ai'] },
        },
        orderBy: { createdAt: 'desc' },
        take: this.MAX_CONTEXT_MESSAGES,
      });

      // 反转并构建上下文（映射角色）
      const roleMap: Record<string, string> = {
        'human': 'user',
        'ai': 'assistant',
      };
      messages = recentMessages.reverse().map((msg: MessageWithSender) => ({
        role: roleMap[msg.senderType] || 'user',
        content: msg.content,
      }));
    }

    return {
      roomId,
      aiModelId,
      messages,
      systemPrompt,
    };
  }

  /**
   * 保存对话上下文
   */
  private async saveContext(
    roomId: string,
    aiModelId: string,
    messages: LLMMessage[],
    lastResponse: string,
  ): Promise<void> {
    // 添加AI响应到上下文
    const allMessages: LLMMessage[] = [
      ...messages,
      { role: 'assistant', content: lastResponse },
    ];

    // 检查是否需要摘要
    if (this.estimateTokenCount(allMessages) > this.MAX_TOKENS) {
      // TODO: 实现摘要逻辑
      // 保留最近的N条消息
      allMessages.splice(0, allMessages.length - this.MAX_CONTEXT_MESSAGES);
    }

    // 将LLMMessage转换为纯JSON对象
    const contextMessagesJson = JSON.parse(JSON.stringify(allMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      name: msg.name,
    }))));

    await this.prisma.aiConversationContext.upsert({
      where: {
        roomId_aiModelId: { roomId, aiModelId },
      },
      create: {
        roomId,
        aiModelId,
        contextMessages: contextMessagesJson,
        tokenCount: this.estimateTokenCount(allMessages),
      },
      update: {
        contextMessages: contextMessagesJson,
        tokenCount: this.estimateTokenCount(allMessages),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 估算token数量
   */
  private estimateTokenCount(messages: LLMMessage[]): number {
    const totalChars = messages.reduce((sum, msg) => {
      const content = typeof msg.content === 'string' 
        ? msg.content 
        : JSON.stringify(msg.content);
      return sum + content.length;
    }, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * 重置AI对话上下文
   */
  async resetContext(roomId: string, aiModelId: string): Promise<void> {
    await this.prisma.aiConversationContext.delete({
      where: {
        roomId_aiModelId: { roomId, aiModelId },
      },
    });
  }

  /**
   * 判断是否启用联网搜索
   * 基于消息内容智能判断
   */
  private shouldEnableWebSearch(userMessage: string): boolean {
    // 检查消息中是否包含搜索关键词
    const searchKeywords = [
      '搜索', '查找', '查询', '最新', '新闻', '今天', '昨天', '最近',
      'search', 'find', 'lookup', 'latest', 'news', 'today', 'recent',
      '天气', '股价', '价格', '多少钱', '实时', '当前', '现在',
      'weather', 'stock', 'price', 'current', 'now',
    ];
    
    const lowerMessage = userMessage.toLowerCase();
    const hasSearchKeyword = searchKeywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );
    
    // 检查是否是事实性问题（包含数字、日期、特定名词）
    const isFactualQuestion = /\d{4}年?|什么时候|多少|哪里|谁|什么|如何|为什么/.test(userMessage);
    
    // 简单的启发式规则：如果消息较短且包含关键词，启用搜索
    const shouldSearch = (hasSearchKeyword && userMessage.length < 200) || 
                         (isFactualQuestion && userMessage.length < 100);
    
    if (shouldSearch) {
      this.logger.log(`消息触发联网搜索: "${userMessage.substring(0, 50)}..."`);
    }
    
    return shouldSearch;
  }

  /**
   * 处理AI响应中的@提及（AI协作模式）
   * 当AI在回复中@其他AI时，触发被@的AI响应
   */
  private async processAIResponseMentions(
    roomId: string,
    fromAiModel: RoomMemberWithAI['aiModel'],
    content: string,
    originalMessageId: string,
  ): Promise<void> {
    if (!fromAiModel) return;

    // 解析AI响应中的@提及
    const mentions = this.extractMentionsFromContent(content);
    if (mentions.length === 0) return;

    this.logger.log(`[AI协作] ${fromAiModel.displayName} 的回复中@了: ${mentions.join(', ')}`);

    // 获取房间内所有AI成员
    const aiMembers = await this.prisma.roomMember.findMany({
      where: {
        roomId,
        memberType: 'ai',
      },
      include: {
        aiModel: true,
      },
    });

    // 找到被@的AI
    const mentionedAiMembers = aiMembers.filter(member => {
      if (!member.aiModel) return false;
      const aiName = member.aiModel.displayName.toLowerCase();
      return mentions.some(mention => 
        aiName.includes(mention.toLowerCase()) ||
        mention.toLowerCase().includes(aiName)
      );
    });

    // 排除自己（AI不应该@自己）
    const targetMembers = mentionedAiMembers.filter(m => m.aiModel?.id !== fromAiModel.id);

    if (targetMembers.length === 0) {
      this.logger.log('[AI协作] 未找到被@的AI成员');
      return;
    }

    this.logger.log(`[AI协作] 触发 ${targetMembers.length} 个AI响应`);

    // 延迟触发被@的AI（避免立即响应，让对话更自然）
    const delay = 1000 + Math.random() * 2000; // 1-3秒随机延迟
    
    await new Promise(resolve => setTimeout(resolve, delay));

    // 并行触发被@的AI
    const promises = targetMembers.map(async (member) => {
      if (member.aiModel) {
        // 构建上下文：包含原始消息和@它的AI的回复
        const contextMessage = `${fromAiModel.displayName} 说: "${content}"\n\n请回应这个话题。`;
        
        await this.processSingleAI(
          roomId,
          member.aiModel,
          contextMessage,
          'ai-system', // 系统用户ID表示这是AI之间的对话
          [], // 不传递mentions，避免无限循环
          member.aiPrompt ?? undefined,
          'normal',
        );
      }
    });

    await Promise.all(promises);
  }

  /**
   * 从内容中提取@提及
   */
  private extractMentionsFromContent(content: string): string[] {
    const mentions: string[] = [];
    const regex = /@([\u4e00-\u9fa5a-zA-Z0-9_-]+)/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    
    return [...new Set(mentions)]; // 去重
  }

  /**
   * 批量处理多个AI模型
   */
  async broadcastToAIs(
    roomId: string,
    userMessage: string,
    userId: string,
    aiModelIds: string[],
  ): Promise<void> {
    const promises = aiModelIds.map(async (aiModelId) => {
      const aiModel = await this.prisma.aIModel.findUnique({
        where: { id: aiModelId },
      });

      if (aiModel) {
        await this.processSingleAI(roomId, aiModel, userMessage, userId);
      }
    });

    await Promise.all(promises);
  }
}
