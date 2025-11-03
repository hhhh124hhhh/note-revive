/**
 * 轻量级AI服务接口
 * 为Note Revive提供最小化的AI功能支持
 */

// AI服务类型定义
export interface AIService {
  name: string;
  provider: 'openai' | 'claude' | 'local' | 'mock';
  enabled: boolean;
  init(): Promise<void>;
  generateSearchSuggestions(query: string, notes: any[]): Promise<SearchSuggestion[]>;
  analyzeTagRelatedNotes(tagName: string, tagNotes: any[], allNotes: any[]): Promise<any[]>;
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

    const noteScores: Array<{ id: string; score: number; relationType: 'content' | 'tags' | 'semantic' }> = [];

    allNotes.forEach(note => {
      if (note.id === noteId || note.isPrivate) return;

      let contentScore = 0;
      let tagScore = 0;
      let semanticScore = 0;

      // 1. 内容相似性分析
      const targetContent = targetNote.content.toLowerCase();
      const noteContent = note.content.toLowerCase();

      // 提取有意义的词汇（长度大于2的词）
      const targetWords = new Set(targetContent.split(/\s+/).filter((word: string) => word.length > 2));
      const noteWords = new Set(noteContent.split(/\s+/).filter((word: string) => word.length > 2));

      // 计算词汇重叠度
      const commonWords = [...targetWords].filter(word => noteWords.has(word));
      if (commonWords.length > 0) {
        const jaccardSimilarity = commonWords.length / (targetWords.size + noteWords.size - commonWords.length);
        contentScore = jaccardSimilarity * 0.8; // 内容权重0.8
      }

      // 2. 标签关联分析
      if (targetNote.tags && note.tags) {
        const commonTags = targetNote.tags.filter((tag: string) => note.tags.includes(tag));
        if (commonTags.length > 0) {
          tagScore = Math.min(commonTags.length * 0.4, 1.0); // 标签权重，但不超过1.0
        }
      }

      // 3. 语义关联分析（基于关键词模式匹配）
      semanticScore = this.calculateSemanticSimilarity(targetContent, noteContent);

      // 综合评分
      const finalScore = Math.max(contentScore, tagScore, semanticScore);

      if (finalScore > 0.25) { // 降低阈值，增加关联性
        let relationType: 'content' | 'tags' | 'semantic' = 'semantic';

        if (tagScore > contentScore && tagScore > semanticScore) {
          relationType = 'tags';
        } else if (contentScore > semanticScore) {
          relationType = 'content';
        }

        noteScores.push({
          id: note.id,
          score: finalScore,
          relationType
        });
      }
    });

    if (noteScores.length === 0) return null;

    // 按评分排序，选择最相关的便签
    noteScores.sort((a, b) => b.score - a.score);
    const topNotes = noteScores.slice(0, 4); // 增加到4个相关便签

    // 计算整体置信度
    const avgConfidence = topNotes.reduce((sum, note) => sum + note.score, 0) / topNotes.length;

    return {
      noteId,
      relatedNoteIds: topNotes.map(note => note.id),
      relationType: topNotes[0].relationType, // 使用最高分便签的关联类型
      confidence: Math.min(avgConfidence * 1.2, 0.95) // 稍微提升置信度
    };
  }

  /**
   * 计算语义相似度（基于关键词模式）
   */
  private calculateSemanticSimilarity(content1: string, content2: string): number {
    let similarity = 0;

    // 时间关联性
    const timeKeywords = ['今天', '明天', '昨天', '上周', '下周', '本月', '去年', '计划', '提醒', '会议'];
    const timeMatches1 = timeKeywords.filter(keyword => content1.includes(keyword));
    const timeMatches2 = timeKeywords.filter(keyword => content2.includes(keyword));
    if (timeMatches1.length > 0 && timeMatches2.length > 0) {
      similarity += 0.3;
    }

    // 主题关联性（常见主题词）
    const topicKeywords = [
      '项目', '工作', '学习', '生活', '健康', '财务', '旅行', '家庭',
      '朋友', '购物', '电影', '音乐', '书籍', '运动', '美食'
    ];
    const topicMatches1 = topicKeywords.filter(keyword => content1.includes(keyword));
    const topicMatches2 = topicKeywords.filter(keyword => content2.includes(keyword));
    const commonTopics = topicMatches1.filter(topic => topicMatches2.includes(topic));
    if (commonTopics.length > 0) {
      similarity += commonTopics.length * 0.2;
    }

    // 情感关联性
    const emotionKeywords = ['开心', '难过', '生气', '激动', '焦虑', '满足', '失望', '期待'];
    const emotionMatches1 = emotionKeywords.filter(keyword => content1.includes(keyword));
    const emotionMatches2 = emotionKeywords.filter(keyword => content2.includes(keyword));
    if (emotionMatches1.length > 0 && emotionMatches2.length > 0) {
      similarity += 0.25;
    }

    // 行为关联性
    const actionKeywords = ['购买', '完成', '开始', '联系', '预约', '预订', '发送', '接收'];
    const actionMatches1 = actionKeywords.filter(keyword => content1.includes(keyword));
    const actionMatches2 = actionKeywords.filter(keyword => content2.includes(keyword));
    const commonActions = actionMatches1.filter(action => actionMatches2.includes(action));
    if (commonActions.length > 0) {
      similarity += commonActions.length * 0.15;
    }

    return Math.min(similarity, 0.7); // 语义相似度最高0.7
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

  /**
   * 生成搜索建议
   */
  async generateSearchSuggestions(query: string, notes: any[]): Promise<SearchSuggestion[]> {
    try {
      const suggestions: SearchSuggestion[] = [];
      const queryWords = query.toLowerCase().split(/\s+/);

      notes.forEach(note => {
        let relevanceScore = 0;
        const matchedKeywords: string[] = [];

        // 检查标题匹配
        const title = note.title || '';
        const titleLower = title.toLowerCase();
        queryWords.forEach(word => {
          if (titleLower.includes(word)) {
            relevanceScore += 0.5;
            matchedKeywords.push(word);
          }
        });

        // 检查内容匹配
        const contentLower = note.content.toLowerCase();
        queryWords.forEach(word => {
          if (contentLower.includes(word)) {
            relevanceScore += 0.3;
            matchedKeywords.push(word);
          }
        });

        // 检查标签匹配
        if (note.tags) {
          note.tags.forEach((tag: string) => {
            queryWords.forEach(word => {
              if (tag.toLowerCase().includes(word)) {
                relevanceScore += 0.4;
                matchedKeywords.push(tag);
              }
            });
          });
        }

        if (relevanceScore > 0.2) {
          suggestions.push({
            noteId: note.id,
            relevanceScore: Math.min(relevanceScore, 1.0),
            reason: `匹配关键词: ${[...new Set(matchedKeywords)].slice(0, 3).join(', ')}`,
            matchedKeywords: [...new Set(matchedKeywords)]
          });
        }
      });

      return suggestions
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5);
    } catch (error) {
      console.error('生成搜索建议失败:', error);
      return [];
    }
  }

  /**
   * 分析标签关联便签
   */
  async analyzeTagRelatedNotes(
    tagName: string,
    tagNotes: any[],
    allNotes: any[]
  ): Promise<any[]> {
    try {
      // 使用简单的关键词匹配算法
      const results: any[] = [];

      for (const tagNote of tagNotes) {
        for (const note of allNotes) {
          if (note.id === tagNote.id) continue;

          let score = 0;
          const reasons: string[] = [];

          // 检查共同标签
          const commonTags = tagNote.tags.filter((tag: string) => note.tags.includes(tag));
          if (commonTags.length > 0) {
            score += commonTags.length * 10;
            reasons.push(`共同标签: ${commonTags.join(', ')}`);
          }

          // 检查内容相似性
          const tagWords = new Set(tagNote.content.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2));
          const noteWords = new Set(note.content.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2));
          const commonWords = [...tagWords].filter((w: unknown) => noteWords.has(w));

          if (commonWords.length > 0) {
            score += commonWords.length * 2;
            reasons.push(`内容关键词: ${commonWords.slice(0, 3).join(', ')}`);
          }

          if (score > 5) {
            results.push({
              note: note,
              confidence: Math.min(score / 50, 1.0),
              reasons: reasons
            });
          }
        }
      }

      return results.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
    } catch (error) {
      console.error('分析标签关联失败:', error);
      return [];
    }
  }
}

// 全局AI服务实例
export const aiService = new LightweightAIService();

// 导出便捷函数
export const getSearchSuggestions = aiService.getSearchSuggestions.bind(aiService);
export const getNoteRelations = aiService.getNoteRelations.bind(aiService);
export const getReviewSuggestions = aiService.getReviewSuggestions.bind(aiService);