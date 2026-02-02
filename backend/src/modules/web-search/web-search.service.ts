import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);

  /**
   * 执行网络搜索
   * 当前使用模拟数据，生产环境应接入真实搜索引擎API
   */
  async search(query: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      this.logger.log(`开始搜索: ${query}`);
      
      // 生产环境应替换为真实搜索API调用
      // 例如：Google Custom Search, Bing Search, SerpAPI等
      
      // 暂时返回模拟结果
      return this.getMockResults(query);
      
    } catch (error) {
      this.logger.error(`搜索失败: ${error.message}`);
      return this.getMockResults(query);
    }
  }

  /**
   * 模拟搜索结果（开发/测试用）
   * 生产环境请替换为真实搜索API
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
        snippet: `百度百科中关于${query}的词条信息。建议配置真实的搜索引擎API（如Google Custom Search、Bing Search等）以获得更好的搜索效果。`,
      },
      {
        title: '如何配置搜索引擎API',
        link: 'https://github.com/polymind/polymind',
        snippet: '查看项目文档了解如何配置真实搜索API。支持：Google Custom Search、Bing Search API、SerpAPI等。',
      },
    ];
  }

  /**
   * 构建带搜索结果的prompt
   */
  buildSearchPrompt(originalQuery: string, searchResults: SearchResult[]): string {
    const resultsText = searchResults
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}`)
      .join('\n\n');

    return `用户问题: ${originalQuery}

基于以下搜索结果回答问题：
${resultsText}

请根据以上信息回答用户问题。如果搜索结果不够相关，请基于你的知识回答。回答:`;
  }
}
