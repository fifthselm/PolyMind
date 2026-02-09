import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  content?: string;
}

@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);
  private readonly tavilyApiKey: string;
  private readonly googleApiKey: string;
  private readonly googleCx: string;

  constructor() {
    this.tavilyApiKey = process.env.TAVILY_API_KEY || '';
    this.googleApiKey = process.env.GOOGLE_API_KEY || '';
    this.googleCx = process.env.GOOGLE_CX || '';
  }

  /**
   * 执行网络搜索
   * 优先使用Tavily API，回退到Google Custom Search
   */
  async search(query: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      this.logger.log(`开始搜索: ${query}`);

      // 优先使用Tavily API（专为AI优化）
      if (this.tavilyApiKey) {
      }

      // 回退到Google Custom Search
      if (this.googleApiKey && this.googleCx) {
        return await this.searchWithGoogle(query, limit);
      }

      // 使用模拟数据（开发环境）
      this.logger.warn('未配置搜索API，使用模拟数据');
      return this.getMockResults(query);

    } catch (error) {
      this.logger.error(`搜索失败: ${error.message}`);
      return this.getMockResults(query);
    }
  }

  /**
   * Tavily API搜索（推荐）
   * 专为AI应用优化的搜索引擎
   */
  private async searchWithTavily(query: string, limit: number): Promise<SearchResult[]> {
    try {
      const response = await (axios as any).post(
        'https://api.tavily.com/search',
        {
          api_key: this.tavilyApiKey,
          query,
          search_depth: 'basic',
          include_answer: false,
          include_images: false,
          max_results: limit,
        },
        {
          timeout: 10000,
        }
      );

      const results = response.data.results || [];

      return results.map((r: any) => ({
        title: r.title,
        link: r.url,
        snippet: r.content || r.snippet,
        content: r.content,
      }));
    } catch (error) {
      this.logger.error('Tavily搜索失败:', error);
      throw error;
    }
  }

  /**
   * Google Custom Search API
   */
  private async searchWithGoogle(query: string, limit: number): Promise<SearchResult[]> {
    try {
      const response = await (axios as any).get(
        'https://www.googleapis.com/customsearch/v1',
        {
          params: {
            key: this.googleApiKey,
            cx: this.googleCx,
            q: query,
            num: Math.min(limit, 10),
          },
          timeout: 10000,
        }
      );

      const items = response.data.items || [];

      return items.map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
      }));
    } catch (error) {
      this.logger.error('Google搜索失败:', error);
      throw error;
    }
  }

  /**
   * 模拟搜索结果（开发/测试用）
   */
  private getMockResults(query: string): SearchResult[] {
    return [
      {
        title: `关于"${query}"的搜索信息`,
        link: 'https://www.baidu.com/s?wd=' + encodeURIComponent(query),
        snippet: `这是关于${query}的详细信息。在实际生产环境中，这里会显示真实的搜索结果。当前为模拟数据模式。`,
      },
      {
        title: `${query} - 百度百科`,
        link: 'https://baike.baidu.com/item/' + encodeURIComponent(query),
        snippet: `百度百科中关于${query}的词条信息。建议配置真实的搜索引擎API（如Tavily、Google Custom Search等）以获得更好的搜索效果。`,
      },
      {
        title: '如何配置搜索引擎API',
        link: 'https://github.com/fifthselm/PolyMind',
        snippet: '查看项目文档了解如何配置真实搜索API。支持：Tavily API（推荐）、Google Custom Search、Bing Search API等。',
      },
    ];
  }

  /**
   * 构建带搜索结果的prompt
   */
  buildSearchPrompt(originalQuery: string, searchResults: SearchResult[]): string {
    const resultsText = searchResults
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.content || r.snippet}`)
      .join('\n\n');

    return `用户问题: ${originalQuery}

基于以下搜索结果回答问题：
${resultsText}

请根据以上信息回答用户问题。如果搜索结果不够相关，请基于你的知识回答。回答:`;
  }

  /**
   * 检查搜索配置状态
   */
  getSearchConfigStatus(): {
    tavily: boolean;
    google: boolean;
    mock: boolean;
  } {
    return {
      tavily: !!this.tavilyApiKey,
      google: !!(this.googleApiKey && this.googleCx),
      mock: !this.tavilyApiKey && !(this.googleApiKey && this.googleCx),
    };
  }
}
