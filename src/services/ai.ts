/**
 * 轻量级AI服务接口
 * 为Note Revive提供最小化的AI功能支持
 */

// AI服务类型定义
export interface AIService {
  name: string;
  provider: 'openai' | 'claude' | 'local' | 'mock';
  enabled: boolean;
}

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

// AI设置接口
export interface AISettings {
  enabled: boolean;
  provider: 'openai' | 'claude' | 'mock';
  apiKey?: string;
  localMode: boolean;
  searchEnabled: boolean;
  relationEnabled: boolean;
  reminderEnabled: boolean;
}

// 默认AI设置
export const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: false,
  provider: 'mock',
  localMode: true,
  searchEnabled: true,
  relationEnabled: true,
  reminderEnabled: true
};

/**
 * 轻量级AI服务类
 * 主要提供语义搜索、便签关联和智能提醒功能
 */
export class LightweightAIService {
  private settings: AISettings = DEFAULT_AI_SETTINGS;
  private initialized = false;

  constructor() {
    this.init();
  }

  /**
   * 初始化AI服务
   */
  async init(): Promise<void> {
    try {
      // 从数据库加载AI设置
      const savedSettings = await this.loadSettings();
      if (savedSettings) {
        this.settings = { ...DEFAULT_AI_SETTINGS, ...savedSettings };
      }
      this.initialized = true;
    } catch (error) {
      console.warn('AI服务初始化失败，使用默认设置:', error);
      this.initialized = true;
    }
  }

  /**
   * 检查AI服务是否可用
   */
  isAvailable(): boolean {
    return this.initialized && this.settings.enabled;
  }

  /**
   * 更新AI设置
   */
  async updateSettings(newSettings: Partial<AISettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
  }

  /**
   * 获取当前设置
   */
  getSettings(): AISettings {
    return { ...this.settings };
  }

  /**
   * 智能搜索增强
   * 当关键词搜索无结果时，提供语义搜索建议
   */
  async getSearchSuggestions(
    query: string,
    allNotes: any[]
  ): Promise<SearchSuggestion[]> {
    if (!this.isAvailable() || !this.settings.searchEnabled) {
      return [];
    }

    // 模拟语义搜索逻辑
    const suggestions: SearchSuggestion[] = [];

    // 简单的关键词匹配和语义分析
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 1);

    allNotes.forEach(note => {
      if (note.isPrivate) return; // 跳过私密便签

      let relevanceScore = 0;
      const matchedKeywords: string[] = [];

      // 计算内容相关性
      const contentLower = note.content.toLowerCase();

      // 关键词匹配
      queryWords.forEach(word => {
        if (contentLower.includes(word)) {
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

      // 如果有一定相关性，添加到建议列表
      if (relevanceScore > 0.2 && relevanceScore < 1.0) { // 小于1.0避免完全匹配的结果
        suggestions.push({
          noteId: note.id,
          relevanceScore: Math.min(relevanceScore, 0.95),
          reason: this.generateSuggestionReason(matchedKeywords),
          matchedKeywords
        });
      }
    });

    // 按相关性排序，返回前5个
    return suggestions
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);
  }

  /**
   * 生成搜索建议理由
   */
  private generateSuggestionReason(matchedKeywords: string[]): string {
    if (matchedKeywords.length === 0) return '内容相关';

    const keywordText = matchedKeywords.join('、');
    return `包含关键词: ${keywordText}`;
  }

  /**
   * 获取便签关联建议
   */
  async getNoteRelations(
    noteId: string,
    allNotes: any[]
  ): Promise<NoteRelation | null> {
    if (!this.isAvailable() || !this.settings.relationEnabled) {
      return null;
    }

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

      // 如果置信度足够高，添加为相关便签
      if (confidence > 0.3) {
        relatedNoteIds.push(note.id);
      }
    });

    if (relatedNoteIds.length === 0) return null;

    return {
      noteId,
      relatedNoteIds: relatedNoteIds.slice(0, 3), // 最多3个相关便签
      relationType: 'semantic',
      confidence: Math.min(relatedNoteIds.length * 0.4, 0.9)
    };
  }

  /**
   * 智能回顾建议
   * 根据便签内容和时间推荐回顾优先级
   */
  async getReviewSuggestions(allNotes: any[]): Promise<string[]> {
    if (!this.isAvailable() || !this.settings.reminderEnabled) {
      return [];
    }

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

      // 基于状态优先级（草稿需要回顾）
      if (note.status === 'draft') priority += 0.4;
      else if (note.status === 'saved') priority += 0.2;

      // 基于内容长度（重要内容通常较长）
      if (note.content.length > 500) priority += 0.1;
      else if (note.content.length > 200) priority += 0.05;

      if (priority > 0.3) {
        suggestions.push(note.id);
      }
    });

    return suggestions.slice(0, 5); // 最多建议5个便签
  }

  /**
   * 从数据库加载设置
   */
  private async loadSettings(): Promise<Partial<AISettings> | null> {
    try {
      const { db } = await import('../db');
      const settings = await db.settings.orderBy('id').last();
      if (settings) {
        return {
          enabled: settings.aiEnabled,
          provider: settings.aiProvider || 'mock',
          apiKey: settings.aiApiKey,
          localMode: true, // 默认本地模式
          searchEnabled: true,
          relationEnabled: true,
          reminderEnabled: true
        };
      }
    } catch (error) {
      console.warn('加载AI设置失败:', error);
    }
    return null;
  }

  /**
   * 保存设置到数据库
   */
  private async saveSettings(): Promise<void> {
    try {
      const { db } = await import('../db');
      await db.settings.where('id').equals(1).modify({
        aiEnabled: this.settings.enabled,
        aiProvider: this.settings.provider,
        aiApiKey: this.settings.apiKey,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('保存AI设置失败:', error);
    }
  }
}

// 全局AI服务实例
export const aiService = new LightweightAIService();

// 导出便捷函数
export const getSearchSuggestions = aiService.getSearchSuggestions.bind(aiService);
export const getNoteRelations = aiService.getNoteRelations.bind(aiService);
export const getReviewSuggestions = aiService.getReviewSuggestions.bind(aiService);