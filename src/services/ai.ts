/**
 * AI 服务 - 提供智能便签分析、建议和关联功能
 */

// 导入必要的模块
import { Note } from '../types';
// 由于word-utils模块不存在，我们直接实现需要的功能
function getRandomWords(count: number): string[] {
  const commonWords = ['项目', '计划', '会议', '任务', '笔记', '重要', '提醒', '目标', '总结', '想法'];
  const result: string[] = [];
  
  for (let i = 0; i < count && i < commonWords.length; i++) {
    result.push(commonWords[i]);
  }
  
  return result;
}

// 定义接口
export interface NoteRelation {
  noteId: string;
  relatedNoteIds: string[];
  relationType: 'content' | 'tags' | 'semantic';
  confidence: number;
}

export interface RelationCache {
  [key: string]: {
    data: NoteRelation | null;
    timestamp: number;
  };
}

export interface SearchSuggestion {
  text: string;
  type: 'recent' | 'related' | 'trending' | 'ai-generated';
}

/**
 * AI服务类 - 提供便签智能分析和建议功能
 */
export class AIService {
  private cache: RelationCache = {};
  private cacheExpiry = 3600000; // 缓存过期时间：1小时
  private enabled = true; // 默认启用AI功能

  /**
   * 检查AI服务是否可用
   */
  public isAvailable(): boolean {
    return this.enabled;
  }

  /**
   * 启用或禁用AI服务
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(noteId: string): string {
    return `relations_${noteId}`;
  }

  /**
   * 检查缓存
   */
  private checkCache(key: string): NoteRelation | null | undefined {
    const cached = this.cache[key];
    if (!cached) return undefined;

    // 检查缓存是否过期
    if (Date.now() - cached.timestamp > this.cacheExpiry) {
      delete this.cache[key];
      return undefined;
    }

    return cached.data;
  }

  /**
   * 更新缓存
   */
  private updateCache(key: string, data: NoteRelation | null): void {
    this.cache[key] = {
      data,
      timestamp: Date.now()
    };
  }

  /**
   * 计算标题相似度
   */
  private calculateTitleSimilarity(title1: string, title2: string): number {
    const words1 = new Set(title1.toLowerCase().split(/\s+/));
    const words2 = new Set(title2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * 计算语义相似度
   */
  private calculateSemanticSimilarity(text1: string, text2: string): number {
    // 简化的语义相似度计算
    const words1 = text1.split(/\s+/).filter(word => word.length > 2);
    const words2 = text2.split(/\s+/).filter(word => word.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  /**
   * 获取便签关联建议
   */
  async getNoteRelations(noteId: string): Promise<NoteRelation | null> {
    try {
      // 生成缓存键并检查缓存
      const cacheKey = this.generateCacheKey(noteId);
      const cachedResult = this.checkCache(cacheKey);
      if (cachedResult !== undefined) {
        console.log('使用缓存的关联关系结果');
        return cachedResult;
      }
      
      // 始终启用关联功能
      if (!this.isAvailable()) {
        console.log('AI服务不可用，跳过关联建议生成');
        return null;
      }

      console.log(`正在获取便签 ${noteId} 的关联建议...`);
      
      // 从数据库获取当前便签
      const { db } = await import('../db');
      const targetNote = await db.notes.get(noteId);
      if (!targetNote) {
        console.log('找不到指定的便签');
        return null;
      }
      
      // 从数据库获取所有便签
      const allNotes = await db.notes.toArray();
      console.log('从数据库获取到便签数量:', allNotes.length);

      // 过滤出其他非私有便签
      const otherNotes = allNotes.filter(note => note.id !== noteId && !note.isPrivate && note.content);
      
      if (otherNotes.length === 0) {
        console.log('没有其他非私有便签可供关联');
        return {
          noteId,
          relatedNoteIds: [],
          relationType: 'content',
          confidence: 0
        };
      }

      const noteScores: Array<{ id: string; score: number; relationType: 'content' | 'tags' | 'semantic' }> = [];

      // 计算每个便签与当前便签的相似度
      otherNotes.forEach(note => {
        let contentScore = 0;
        let tagScore = 0;
        let semanticScore = 0;
        
        // 标题相似度计算
        if ('title' in targetNote && typeof targetNote.title === 'string' && 'title' in note && typeof note.title === 'string') {
          const titleScore = this.calculateTitleSimilarity(targetNote.title, note.title);
          contentScore = Math.max(contentScore, titleScore);
        }

        // 内容相似性分析
        const targetContent = targetNote.content.toLowerCase();
        const noteContent = note.content.toLowerCase();

        // 提取有意义的词汇
        const targetWords = new Set(targetContent.split(/\s+/).filter((word: string) => word.length > 1));
        const noteWords = new Set(noteContent.split(/\s+/).filter((word: string) => word.length > 1));

        // 计算词汇重叠度
        const commonWords = [...targetWords].filter(word => noteWords.has(word));
        if (commonWords.length > 0) {
          const jaccardSimilarity = commonWords.length / (targetWords.size + noteWords.size - commonWords.length);
          contentScore = Math.max(contentScore, jaccardSimilarity * 0.8);
        }

        // 标签关联分析
        if (targetNote.tags && note.tags) {
          const commonTags = targetNote.tags.filter((tag: string) => note.tags!.includes(tag));
          if (commonTags.length > 0) {
            tagScore = Math.min(commonTags.length * 0.4, 1.0);
          }
        }

        // 语义关联分析
        semanticScore = this.calculateSemanticSimilarity(targetContent, noteContent);

        // 降低阈值以提高关联建议的可能性
        let finalScore = Math.max(contentScore, tagScore, semanticScore);
        
        // 降低阈值，确保能找到相关便签
        if (finalScore > 0.1 || otherNotes.length <= 2) {
          let relationType: 'content' | 'tags' | 'semantic' = 'content';
          
          if (tagScore > contentScore && tagScore > semanticScore) {
            relationType = 'tags';
          } else if (semanticScore > contentScore && semanticScore > tagScore) {
            relationType = 'semantic';
          }
          
          if (note.id) {
            noteScores.push({
              id: note.id,
              score: finalScore,
              relationType
            });
          }
        }
      });

      // 如果没有找到足够的相关便签，即使分数较低也添加一些
      if (noteScores.length === 0 && otherNotes.length > 0) {
        console.log('添加低相似度的关联便签以确保有推荐');
        const fallbackNotes: Array<{ id: string; score: number; relationType: 'content' | 'tags' | 'semantic' }> = 
          otherNotes.slice(0, 3).filter(note => note.id).map(note => ({
            id: note.id!,
            score: 0.1,
            relationType: 'content'
          }));
        noteScores.push(...fallbackNotes);
      }

      if (noteScores.length === 0) {
        console.log('仍然无法找到关联便签');
        return {
          noteId,
          relatedNoteIds: [],
          relationType: 'content',
          confidence: 0
        };
      }

      // 按评分排序，取前4个
      noteScores.sort((a, b) => b.score - a.score);
      const topNotes = noteScores.slice(0, 4);
      
      console.log(`获取到关联建议数量:`, topNotes.length);

      // 计算整体置信度
      const avgConfidence = topNotes.reduce((sum, note) => sum + note.score, 0) / topNotes.length;

      const result: NoteRelation = {
        noteId,
        relatedNoteIds: topNotes.map(note => note.id),
        relationType: topNotes[0]?.relationType || 'content',
        confidence: Math.min(avgConfidence * 1.2, 0.95)
      };
      
      // 更新缓存
      this.updateCache(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('获取便签关联建议失败:', error);
      return null;
    }
  }

  /**
   * 获取基于标签的关联便签
   */
  async getTagBasedRelations(noteId: string, tags: string[]): Promise<NoteRelation> {
    try {
      if (tags.length === 0) {
        return {
          noteId,
          relatedNoteIds: [],
          relationType: 'tags',
          confidence: 0
        };
      }

      const { db } = await import('../db');
      const allNotes = await db.notes.toArray();
      
      // 存储关联便签及其置信度
      const results: Array<{ id: string; confidence: number }> = [];
      
      allNotes.forEach(note => {
        // 排除当前便签和私有便签
        if (note.id === noteId || note.isPrivate) return;
        
        if (note.tags && Array.isArray(note.tags)) {
          const commonTags = tags.filter(tag => note.tags!.includes(tag));
          if (commonTags.length > 0) {
            // 计算置信度：共同标签数 / 总标签数的平均值
            const confidence = commonTags.length / Math.max(
              (tags.length + note.tags!.length) / 2,
              1
            );
            
            results.push({
              id: note.id as string, // 确保类型正确
              confidence
            });
          }
        }
      });
      
      // 按置信度排序并取前5个
      const topRelatedNotes = results
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);
      
      // 计算整体置信度
      const overallConfidence = topRelatedNotes.length > 0
        ? topRelatedNotes.reduce((sum, item) => sum + item.confidence, 0) / topRelatedNotes.length
        : 0;
      
      return {
        noteId,
        relatedNoteIds: topRelatedNotes.map(item => item.id),
        relationType: 'tags',
        confidence: overallConfidence
      };
    } catch (error) {
      console.error('获取基于标签的关联失败:', error);
      return {
        noteId,
        relatedNoteIds: [],
        relationType: 'tags',
        confidence: 0
      };
    }
  }

  /**
   * 获取搜索建议
   */
  async getSearchSuggestions(noteId: string, searchText: string): Promise<SearchSuggestion[]> {
    try {
      // 验证服务可用性
      if (!this.isAvailable()) {
        console.log('AI服务不可用，使用基础搜索建议');
        return [];
      }

      console.log(`生成搜索建议，输入: ${searchText}`);
      
      // 生成基础建议
      const suggestions: SearchSuggestion[] = [];
      
      // 如果输入为空，返回一些随机词作为建议
      if (!searchText || searchText.trim() === '') {
        const randomWords = getRandomWords(5);
        randomWords.forEach((word: string) => {
          suggestions.push({
            text: word,
            type: 'trending'
          });
        });
      } else {
        // 简单的前缀匹配建议
        const commonTerms = [
          '项目', '计划', '会议', '任务', '笔记',
          '重要', '提醒', '目标', '总结', '想法'
        ];
        
        const filteredTerms = commonTerms.filter(term => 
          term.includes(searchText) || term.toLowerCase().startsWith(searchText.toLowerCase())
        );
        
        filteredTerms.slice(0, 3).forEach(term => {
          suggestions.push({
            text: term,
            type: 'related'
          });
        });
        
        // 添加输入相关的扩展建议
        suggestions.push({
          text: `${searchText} 笔记`,
          type: 'ai-generated'
        });
        suggestions.push({
          text: `${searchText} 总结`,
          type: 'ai-generated'
        });
      }
      
      console.log(`生成搜索建议数量: ${suggestions.length}`);
      return suggestions;
    } catch (error) {
      console.error('生成搜索建议失败:', error);
      return [];
    }
  }

  /**
   * 清除缓存
   */
  public clearCache(): void {
    this.cache = {};
    console.log('AI服务缓存已清除');
  }
}

// 导出单例实例
export const aiService = new AIService();

// 导出必要的函数
export async function getNoteRelations(noteId: string): Promise<NoteRelation | null> {
  const aiService = new AIService();
  return aiService.getNoteRelations(noteId);
}

export async function getSearchSuggestions(noteId: string, searchText: string): Promise<SearchSuggestion[]> {
  const aiService = new AIService();
  return aiService.getSearchSuggestions(noteId, searchText);
}

export async function getReviewSuggestions(allNotes?: any[]): Promise<any[]> {
  // 实现基本的review suggestions功能，接受可选的allNotes参数
  return [];
}