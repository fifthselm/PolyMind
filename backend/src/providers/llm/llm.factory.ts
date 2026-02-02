import { Injectable } from '@nestjs/common';
import { BaseLLMProvider } from './base/base.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { QwenProvider } from './providers/qwen.provider';
import { WenxinProvider } from './providers/wenxin.provider';
import { GLMProvider } from './providers/glm.provider';
import { KimiProvider } from './providers/kimi.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';

@Injectable()
export class LLMProviderFactory {
  constructor(
    private readonly openaiProvider: OpenAIProvider,
    private readonly claudeProvider: ClaudeProvider,
    private readonly geminiProvider: GeminiProvider,
    private readonly qwenProvider: QwenProvider,
    private readonly wenxinProvider: WenxinProvider,
    private readonly glmProvider: GLMProvider,
    private readonly kimiProvider: KimiProvider,
    private readonly deepseekProvider: DeepSeekProvider,
  ) {}

  /**
   * 创建Provider实例
   */
  create(provider: string): BaseLLMProvider {
    const normalizedProvider = provider.toLowerCase();

    switch (normalizedProvider) {
      case 'openai':
        return this.openaiProvider;
      case 'claude':
        return this.claudeProvider;
      case 'gemini':
        return this.geminiProvider;
      case 'qwen':
        return this.qwenProvider;
      case 'wenxin':
        return this.wenxinProvider;
      case 'glm':
        return this.glmProvider;
      case 'kimi':
        return this.kimiProvider;
      case 'deepseek':
        return this.deepseekProvider;
      default:
        throw new Error(`不支持的AI提供商: ${provider}`);
    }
  }

  /**
   * 获取所有Provider信息
   */
  getAllProvidersInfo(): Array<{ name: string; displayName: string; models: string[] }> {
    return [
      {
        name: 'openai',
        displayName: 'OpenAI (GPT-4/3.5)',
        models: this.openaiProvider.supportedModels,
      },
      {
        name: 'claude',
        displayName: 'Anthropic (Claude)',
        models: this.claudeProvider.supportedModels,
      },
      {
        name: 'gemini',
        displayName: 'Google (Gemini)',
        models: this.geminiProvider.supportedModels,
      },
      {
        name: 'qwen',
        displayName: '阿里云 (通义千问)',
        models: this.qwenProvider.supportedModels,
      },
      {
        name: 'wenxin',
        displayName: '百度 (文心一言)',
        models: this.wenxinProvider.supportedModels,
      },
      {
        name: 'glm',
        displayName: '智谱AI (GLM)',
        models: this.glmProvider.supportedModels,
      },
      {
        name: 'kimi',
        displayName: 'Moonshot (Kimi)',
        models: this.kimiProvider.supportedModels,
      },
      {
        name: 'deepseek',
        displayName: 'DeepSeek (深度求索)',
        models: this.deepseekProvider.supportedModels,
      },
    ];
  }
}
