import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { LLMService } from './llm.service';
import { LLMProviderFactory } from './llm.factory';
import { OpenAIProvider } from './providers/openai.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { QwenProvider } from './providers/qwen.provider';
import { WenxinProvider } from './providers/wenxin.provider';
import { GLMProvider } from './providers/glm.provider';
import { KimiProvider } from './providers/kimi.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { ProviderConfig } from './base/types';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // 配置
    {
      provide: 'PROVIDER_CONFIG',
      useFactory: (): ProviderConfig => ({
        apiKey: process.env.OPENAI_API_KEY || '',
        apiEndpoint: process.env.OPENAI_API_ENDPOINT,
        timeout: 60000,
        maxRetries: 3,
      }),
    },
    
    // Providers - 使用 useFactory 注入配置
    {
      provide: 'OPENAI_CONFIG',
      useFactory: (config: ProviderConfig) => config,
      inject: ['PROVIDER_CONFIG'],
    },
    {
      provide: OpenAIProvider,
      useFactory: (config: ProviderConfig) => new OpenAIProvider(config),
      inject: [{ token: 'PROVIDER_CONFIG', optional: false }],
    },
    {
      provide: ClaudeProvider,
      useFactory: (config: ProviderConfig) => new ClaudeProvider(config),
      inject: [{ token: 'PROVIDER_CONFIG', optional: false }],
    },
    {
      provide: GeminiProvider,
      useFactory: (config: ProviderConfig) => new GeminiProvider(config),
      inject: [{ token: 'PROVIDER_CONFIG', optional: false }],
    },
    {
      provide: QwenProvider,
      useFactory: (config: ProviderConfig) => new QwenProvider(config),
      inject: [{ token: 'PROVIDER_CONFIG', optional: false }],
    },
    {
      provide: WenxinProvider,
      useFactory: (config: ProviderConfig) => new WenxinProvider(config),
      inject: [{ token: 'PROVIDER_CONFIG', optional: false }],
    },
    {
      provide: GLMProvider,
      useFactory: (config: ProviderConfig) => new GLMProvider(config),
      inject: [{ token: 'PROVIDER_CONFIG', optional: false }],
    },
    {
      provide: KimiProvider,
      useFactory: (config: ProviderConfig) => new KimiProvider(config),
      inject: [{ token: 'PROVIDER_CONFIG', optional: false }],
    },
    {
      provide: DeepSeekProvider,
      useFactory: (config: ProviderConfig) => new DeepSeekProvider(config),
      inject: [{ token: 'PROVIDER_CONFIG', optional: false }],
    },
    
    // Factory
    LLMProviderFactory,
    
    // Service
    LLMService,
  ],
  exports: [LLMService, LLMProviderFactory],
})
export class LLMModule {}
