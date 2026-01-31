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
    
    // Providers
    OpenAIProvider,
    ClaudeProvider,
    GeminiProvider,
    QwenProvider,
    WenxinProvider,
    GLMProvider,
    KimiProvider,
    DeepSeekProvider,
    
    // Factory
    LLMProviderFactory,
    
    // Service
    LLMService,
  ],
  exports: [LLMService, LLMProviderFactory],
})
export class LLMModule {}
