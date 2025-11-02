/**
 * 增强版AI服务
 * 集成多模型提供商和动态模型拉取功能
 */

import { aiSettingsService } from './ai/index';
import { ModelInfo, ModelUseCase } from './ai/types';

// 搜索建议接口
export interface SearchSuggestion {
  noteId: string;
  relevanceScore: number;
  reason: string;
  matchedKeywords: string[];
}

// 便签关联接口
export interface NoteRelation {
  noteId: string;
  relatedNoteIds: string[];
  relationType: 'content' | 'tags' | 'semantic';
  confidence: number;
}

// AI请求结果
export interface AIRequestResult {
  success: boolean;
  content?: string;
  error?: string;
  provider?: string;
  model?: string;
  tokensUsed?: number;
  responseTime?: number;
}

/**
 * 增强版AI服务类
 * 支持多提供商和动态模型选择
 */
export class EnhancedAIService {
  private initialized = false;

  constructor() {
    this.init();
  }

  /**
   * 初始化AI服务
   */
  async init(): Promise<void> {
    try {
      await aiSettingsService.initialize();
      this.initialized = true;
    } catch (error) {
      console.warn('增强版AI服务初始化失败:', error);
      this.initialized = true; // 仍然设置为已初始化，允许降级功能
    }
  }

  /**
   * 检查AI服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    try {
      const settings = await aiSettingsService.getSettings();
      return settings.globalEnabled && settings.enabledProviders.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取当前活跃的提供商和模型
   */
  async getActiveProviderAndModel(): Promise<{ provider: any; model: string } | null> {
    try {
      const settings = await aiSettingsService.getSettings();
      if (!settings.selectedProvider || !settings.selectedModel) {
        return null;
      }

      return {
        provider: settings.selectedProvider,
        model: settings.selectedModel
      };
    } catch (error) {
      console.error('获取活跃提供商失败:', error);
      return null;
    }
  }

  /**
   * 智能搜索增强
   * 当关键词搜索无结果时，提供语义搜索建议
   */
  async getSearchSuggestions(
    query: string,
    allNotes: any[]
  ): Promise<SearchSuggestion[]> {
    if (!(await this.isAvailable())) {
      return this.getFallbackSearchSuggestions(query, allNotes);
    }

    try {
      const activeConfig = await this.getActiveProviderAndModel();
      if (!activeConfig) {
        return this.getFallbackSearchSuggestions(query, allNotes);
      }

      const suggestions: SearchSuggestion[] = [];
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter(word => word.length > 1);

      // 使用AI进行语义搜索（这里简化为关键词匹配的逻辑）
      // 实际实现中可以调用真实的AI API
      allNotes.forEach(note => {
        if (note.isPrivate) return;

        let relevanceScore = 0;
        const matchedKeywords: string[] = [];

        // 关键词匹配
        queryWords.forEach(word => {
          if (note.content.toLowerCase().includes(word)) {
            relevanceScore += 0.3;
            matchedKeywords.push(word);
          }
        });

        // 标签匹配
        note.tags.forEach((tag: string) => {
          if (tag.toLowerCase().includes(queryLower)) {
            relevanceScore += 0.5;
            matchedKeywords.push(tag);
          }
        });

        if (relevanceScore > 0.2 && relevanceScore < 1.0) {
          suggestions.push({
            noteId: note.id,
            relevanceScore: Math.min(relevanceScore, 0.95),
            reason: this.generateSuggestionReason(matchedKeywords),
            matchedKeywords
          });
        }
      });

      // 记录使用情况
      await this.recordUsage('search', 0, 0, true);

      return suggestions
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5);
    } catch (error) {
      console.error('AI搜索建议失败，使用降级方案:', error);
      return this.getFallbackSearchSuggestions(query, allNotes);
    }
  }

  /**
   * 获取便签关联建议
   */
  async getNoteRelations(
    noteId: string,
    allNotes: any[]
  ): Promise<NoteRelation | null> {
    if (!(await this.isAvailable())) {
      return this.getFallbackNoteRelations(noteId, allNotes);
    }

    try {
      const targetNote = allNotes.find(note => note.id === noteId);
      if (!targetNote || targetNote.isPrivate) return null;

      const relatedNoteIds: string[] = [];

      allNotes.forEach(note => {
        if (note.id === noteId || note.isPrivate) return;

        let confidence = 0;

        // 内容相似性
        const targetWords = new Set(targetNote.content.toLowerCase().split(/\s+/));
        const noteWords = new Set(note.content.toLowerCase().split(/\s+/));
        const intersection = new Set([...targetWords].filter(word => noteWords.has(word)));

        if (intersection.size > 3) {
          confidence += intersection.size / Math.max(targetWords.size, noteWords.size);
        }

        // 标签重叠
        const commonTags = targetNote.tags.filter((tag: string) =>
          note.tags.includes(tag)
        );
        if (commonTags.length > 0) {
          confidence += commonTags.length * 0.3;
        }

        if (confidence > 0.3) {
          relatedNoteIds.push(note.id);
        }
      });

      if (relatedNoteIds.length === 0) return null;

      // 记录使用情况
      await this.recordUsage('relation', 0, 0, true);

      return {
        noteId,
        relatedNoteIds: relatedNoteIds.slice(0, 3),
        relationType: 'semantic',
        confidence: Math.min(relatedNoteIds.length * 0.4, 0.9)
      };
    } catch (error) {
      console.error('AI便签关联失败，使用降级方案:', error);
      return this.getFallbackNoteRelations(noteId, allNotes);
    }
  }

  /**
   * 智能回顾建议
   */
  async getReviewSuggestions(allNotes: any[]): Promise<string[]> {
    if (!(await this.isAvailable())) {
      return this.getFallbackReviewSuggestions(allNotes);
    }

    try {
      const suggestions: string[] = [];

      allNotes.forEach(note => {
        if (note.isPrivate) return;

        let priority = 0;
        const now = new Date();
        const noteAge = now.getTime() - new Date(note.updatedAt).getTime();
        const daysOld = noteAge / (1000 * 60 * 60 * 24);

        // 基于年龄的优先级
        if (daysOld > 30) priority += 0.3;
        else if (daysOld > 14) priority += 0.2;
        else if (daysOld > 7) priority += 0.1;

        // 基于状态优先级
        if (note.status === 'draft') priority += 0.4;
        else if (note.status === 'saved') priority += 0.2;

        // 基于内容长度
        if (note.content.length > 500) priority += 0.1;
        else if (note.content.length > 200) priority += 0.05;

        if (priority > 0.3) {
          suggestions.push(note.id);
        }
      });

      // 记录使用情况
      await this.recordUsage('reminder', 0, 0, true);

      return suggestions.slice(0, 5);
    } catch (error) {
      console.error('AI回顾建议失败，使用降级方案:', error);
      return this.getFallbackReviewSuggestions(allNotes);
    }
  }

  /**
   * AI聊天接口
   */
  async chat(message: string, context?: string): Promise<AIRequestResult> {
    if (!(await this.isAvailable())) {
      return {
        success: false,
        error: 'AI服务不可用，请检查配置'
      };
    }

    const startTime = Date.now();

    try {
      const activeConfig = await this.getActiveProviderAndModel();
      if (!activeConfig) {
        return {
          success: false,
          error: '未选择模型'
        };
      }

      // 这里应该调用真实的AI API
      // 为了演示，返回模拟响应
      const response = await this.mockAIResponse(message, context);

      const responseTime = Date.now() - startTime;
      const tokensUsed = this.estimateTokens(message + (context || '') + response);

      // 记录使用情况
      await this.recordUsage('general', tokensUsed, responseTime, true);

      return {
        success: true,
        content: response,
        provider: activeConfig.provider.name,
        model: activeConfig.model,
        tokensUsed,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // 记录失败的使用情况
      await this.recordUsage('general', 0, responseTime, false);

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        responseTime
      };
    }
  }

  /**
   * 获取推荐的模型
   */
  async getRecommendedModels(useCase: ModelUseCase): Promise<ModelInfo[]> {
    try {
      return await aiSettingsService.getRecommendedModels(useCase);
    } catch (error) {
      console.error('获取推荐模型失败:', error);
      return [];
    }
  }

  /**
   * 搜索模型
   */
  async searchModels(query: string): Promise<Array<{
    provider: string;
    model: ModelInfo;
    relevanceScore: number;
  }>> {
    try {
      return await aiSettingsService.searchModels(query);
    } catch (error) {
      console.error('搜索模型失败:', error);
      return [];
    }
  }

  /**
   * 私有方法：记录使用情况
   */
  private async recordUsage(
    useCase: 'search' | 'relation' | 'reminder' | 'general',
    tokensUsed: number,
    responseTime: number,
    success: boolean
  ): Promise<void> {
    try {
      const activeConfig = await this.getActiveProviderAndModel();
      if (activeConfig && activeConfig.provider.id) {
        await aiSettingsService.recordUsage(
          activeConfig.provider.id,
          activeConfig.model,
          useCase,
          tokensUsed,
          responseTime,
          success
        );
      }
    } catch (error) {
      console.error('记录使用情况失败:', error);
    }
  }

  /**
   * 私有方法：生成搜索建议理由
   */
  private generateSuggestionReason(matchedKeywords: string[]): string {
    if (matchedKeywords.length === 0) return '内容相关';
    return `包含关键词: ${matchedKeywords.join('、')}`;
  }

  /**
   * 私有方法：模拟AI响应
   */
  private async mockAIResponse(message: string, context?: string): Promise<string> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const responses = [
      '这是一个很好的问题。根据您的便签内容，我建议...',
      '基于您的记录，我发现了一些有趣的模式...',
      '让我帮您分析一下这个内容...',
      '根据上下文，我理解您想要...'
    ];

    return responses[Math.floor(Math.random() * responses.length)] +
           '\n\n这是一个模拟响应，实际使用时需要连接真实的AI服务。';
  }

  /**
   * 私有方法：估算token数量
   */
  private estimateTokens(text: string): number {
    // 简单的token估算：大约4个字符等于1个token
    return Math.ceil(text.length / 4);
  }

  /**
   * 私有方法：降级搜索建议
   */
  private getFallbackSearchSuggestions(query: string, allNotes: any[]): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 1);

    allNotes.forEach(note => {
      if (note.isPrivate) return;

      let relevanceScore = 0;
      const matchedKeywords: string[] = [];

      queryWords.forEach(word => {
        if (note.content.toLowerCase().includes(word)) {
          relevanceScore += 0.3;
          matchedKeywords.push(word);
        }
      });

      note.tags.forEach((tag: string) => {
        if (tag.toLowerCase().includes(queryLower)) {
          relevanceScore += 0.5;
          matchedKeywords.push(tag);
        }
      });

      if (relevanceScore > 0.2 && relevanceScore < 1.0) {
        suggestions.push({
          noteId: note.id,
          relevanceScore: Math.min(relevanceScore, 0.95),
          reason: this.generateSuggestionReason(matchedKeywords),
          matchedKeywords
        });
      }
    });

    return suggestions
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);
  }

  /**
   * 私有方法：降级便签关联
   */
  private getFallbackNoteRelations(noteId: string, allNotes: any[]): NoteRelation | null {
    const targetNote = allNotes.find(note => note.id === noteId);
    if (!targetNote || targetNote.isPrivate) return null;

    const relatedNoteIds: string[] = [];

    allNotes.forEach(note => {
      if (note.id === noteId || note.isPrivate) return;

      let confidence = 0;
      const targetWords = new Set(targetNote.content.toLowerCase().split(/\s+/));
      const noteWords = new Set(note.content.toLowerCase().split(/\s+/));
      const intersection = new Set([...targetWords].filter(word => noteWords.has(word)));

      if (intersection.size > 3) {
        confidence += intersection.size / Math.max(targetWords.size, noteWords.size);
      }

      const commonTags = targetNote.tags.filter((tag: string) =>
        note.tags.includes(tag)
      );
      if (commonTags.length > 0) {
        confidence += commonTags.length * 0.3;
      }

      if (confidence > 0.3) {
        relatedNoteIds.push(note.id);
      }
    });

    if (relatedNoteIds.length === 0) return null;

    return {
      noteId,
      relatedNoteIds: relatedNoteIds.slice(0, 3),
      relationType: 'semantic',
      confidence: Math.min(relatedNoteIds.length * 0.4, 0.9)
    };
  }

  /**
   * 私有方法：降级回顾建议
   */
  private getFallbackReviewSuggestions(allNotes: any[]): string[] {
    const suggestions: string[] = [];

    allNotes.forEach(note => {
      if (note.isPrivate) return;

      let priority = 0;
      const now = new Date();
      const noteAge = now.getTime() - new Date(note.updatedAt).getTime();
      const daysOld = noteAge / (1000 * 60 * 60 * 24);

      if (daysOld > 30) priority += 0.3;
      else if (daysOld > 14) priority += 0.2;
      else if (daysOld > 7) priority += 0.1;

      if (note.status === 'draft') priority += 0.4;
      else if (note.status === 'saved') priority += 0.2;

      if (note.content.length > 500) priority += 0.1;
      else if (note.content.length > 200) priority += 0.05;

      if (priority > 0.3) {
        suggestions.push(note.id);
      }
    });

    return suggestions.slice(0, 5);
  }
}

// 全局增强版AI服务实例
export const enhancedAIService = new EnhancedAIService();

// 导出便捷函数
export const getEnhancedSearchSuggestions = enhancedAIService.getSearchSuggestions.bind(enhancedAIService);
export const getEnhancedNoteRelations = enhancedAIService.getNoteRelations.bind(enhancedAIService);
export const getEnhancedReviewSuggestions = enhancedAIService.getReviewSuggestions.bind(enhancedAIService);
export const chatWithAI = enhancedAIService.chat.bind(enhancedAIService);