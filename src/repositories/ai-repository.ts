import { aiDb, AISuggestion, AIProvider, AIModelUsage, AIModelCache } from '../db/ai-db';
import { Note as NoteType } from '../types';

/**
 * AI功能数据访问层 - Repository模式
 * 封装所有AI相关的数据库操作
 */
export class AIRepository {
  private static instance: AIRepository;

  private constructor() {}

  public static getInstance(): AIRepository {
    if (!AIRepository.instance) {
      AIRepository.instance = new AIRepository();
    }
    return AIRepository.instance;
  }

  // ==================== AI提供商管理 ====================

  /**
   * 获取所有AI提供商
   */
  async getProviders(): Promise<AIProvider[]> {
    try {
      return await aiDb.aiProviders.orderBy('createdAt').toArray();
    } catch (error) {
      console.error('❌ 获取AI提供商失败:', error);
      return [];
    }
  }

  /**
   * 获取启用的AI提供商
   */
  async getEnabledProviders(): Promise<AIProvider[]> {
    try {
      // 先获取所有提供商，然后手动过滤启用的
      const allProviders = await aiDb.aiProviders.toArray();
      return allProviders.filter(provider => provider.enabled);
    } catch (error) {
      console.error('❌ 获取启用的AI提供商失败:', error);
      return [];
    }
  }

  /**
   * 根据类型获取AI提供商
   */
  async getProviderByType(type: string): Promise<AIProvider | undefined> {
    try {
      return await aiDb.aiProviders.where('type').equals(type).first();
    } catch (error) {
      console.error('❌ 根据类型获取AI提供商失败:', error);
      return undefined;
    }
  }

  /**
   * 创建AI提供商
   */
  async createProvider(provider: Omit<AIProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    try {
      const newProvider: Omit<AIProvider, 'id'> = {
        ...provider,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const id = await aiDb.aiProviders.add(newProvider);
      console.log('✅ AI提供商创建成功:', id);
      return id;
    } catch (error) {
      console.error('❌ 创建AI提供商失败:', error);
      throw new Error(`创建AI提供商失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 更新AI提供商
   */
  async updateProvider(id: number, updates: Partial<AIProvider>): Promise<void> {
    try {
      await aiDb.aiProviders.update(id, {
        ...updates,
        updatedAt: new Date()
      });
      console.log('✅ AI提供商更新成功:', id);
    } catch (error) {
      console.error('❌ 更新AI提供商失败:', error);
      throw new Error(`更新AI提供商失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 删除AI提供商
   */
  async deleteProvider(id: number): Promise<void> {
    try {
      await aiDb.transaction('rw', aiDb.aiProviders, aiDb.aiModelUsage, aiDb.aiModelCache, async () => {
        await aiDb.aiProviders.delete(id);
        await aiDb.aiModelUsage.where('providerId').equals(id).delete();
        await aiDb.aiModelCache.where('providerId').equals(id).delete();
      });
      console.log('✅ AI提供商删除成功:', id);
    } catch (error) {
      console.error('❌ 删除AI提供商失败:', error);
      throw new Error(`删除AI提供商失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 切换提供商启用状态
   */
  async toggleProvider(id: number): Promise<void> {
    try {
      const provider = await aiDb.aiProviders.get(id);
      if (provider) {
        await this.updateProvider(id, { enabled: !provider.enabled });
      }
    } catch (error) {
      console.error('❌ 切换提供商状态失败:', error);
      throw new Error(`切换提供商状态失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ==================== AI建议管理 ====================

  /**
   * 保存AI建议
   */
  async saveSuggestion(suggestion: Omit<AISuggestion, 'id'>): Promise<number[]> {
    try {
      const id = await aiDb.aiSuggestions.add(suggestion);
      console.log(`✅ 保存AI建议成功: 1条`);
      return [id]; // 返回单个ID的数组，保持返回类型一致
    } catch (error) {
      console.error('❌ 保存AI建议失败:', error);
      throw new Error(`保存AI建议失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 批量保存AI建议
   */
  async saveSuggestions(suggestions: Omit<AISuggestion, 'id'>[]): Promise<number[]> {
    try {
      // 逐个添加以确保返回正确的ID数组
      const ids: number[] = [];
      for (const suggestion of suggestions) {
        const id = await aiDb.aiSuggestions.add(suggestion);
        ids.push(id);
      }
      console.log(`✅ 批量保存AI建议成功: ${ids.length}条`);
      return ids;
    } catch (error) {
      console.error('❌ 批量保存AI建议失败:', error);
      throw new Error(`批量保存AI建议失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取便签的AI建议
   */
  async getSuggestions(noteId: string, suggestionType?: AISuggestion['suggestionType']): Promise<AISuggestion[]> {
    try {
      let query = aiDb.aiSuggestions.where('noteId').equals(noteId);

      if (suggestionType) {
        query = query.and((suggestion: AISuggestion) => suggestion.suggestionType === suggestionType);
      }

      return await query.toArray();
    } catch (error) {
      console.error('❌ 获取AI建议失败:', error);
      return [];
    }
  }

  /**
   * 获取最近的AI建议
   */
  async getRecentSuggestions(limit: number = 20): Promise<AISuggestion[]> {
    try {
      // 先获取所有数据，然后手动排序和限制数量
      const allSuggestions = await aiDb.aiSuggestions.toArray();
      return allSuggestions
        .sort((a, b) => new Date(b.lastAnalyzed).getTime() - new Date(a.lastAnalyzed).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('❌ 获取最近AI建议失败:', error);
      return [];
    }
  }

  /**
   * 按类型获取AI建议
   */
  async getSuggestionsByType(suggestionType: AISuggestion['suggestionType'], limit: number = 50): Promise<AISuggestion[]> {
    try {
      // 先获取匹配类型的所有建议，然后手动排序和限制数量
      const allSuggestions = await aiDb.aiSuggestions.toArray();
      return allSuggestions
        .filter(s => s.suggestionType === suggestionType)
        .sort((a, b) => new Date(b.lastAnalyzed).getTime() - new Date(a.lastAnalyzed).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('❌ 按类型获取AI建议失败:', error);
      return [];
    }
  }

  /**
   * 删除AI建议
   */
  async deleteSuggestion(id: number): Promise<void> {
    try {
      await aiDb.aiSuggestions.delete(id);
      console.log('✅ AI建议删除成功:', id);
    } catch (error) {
      console.error('❌ 删除AI建议失败:', error);
      throw new Error(`删除AI建议失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 清理过期的AI建议
   */
  async cleanupExpiredSuggestions(daysOld: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      const suggestionsToDelete = await aiDb.aiSuggestions
        .where('lastAnalyzed')
        .below(cutoffDate)
        .toArray();
      
      // 批量删除并返回删除的记录数
      if (suggestionsToDelete.length > 0) {
        const ids = suggestionsToDelete.map(s => s.id!);
        await aiDb.aiSuggestions.bulkDelete(ids);
      }

      console.log(`✅ 清理过期AI建议: 删除了 ${suggestionsToDelete.length} 条记录`);
      return suggestionsToDelete.length;
    } catch (error) {
      console.error('❌ 清理过期AI建议失败:', error);
      return 0;
    }
  }

  // ==================== AI使用统计管理 ====================

  /**
   * 记录模型使用
   */
  async recordModelUsage(
    providerId: number,
    modelId: string,
    useCase: AIModelUsage['useCase'],
    tokensUsed: number,
    cost: number,
    responseTime: number,
    success: boolean
  ): Promise<void> {
    try {
      const now = new Date();
      const existing = await aiDb.aiModelUsage
        .where('providerId')
        .equals(providerId)
        .and((usage: AIModelUsage) => usage.modelId === modelId && usage.useCase === useCase)
        .first();

      if (existing) {
        // 更新现有记录
        const totalRequests = existing.requestCount + 1;
        const totalTokens = existing.totalTokens + tokensUsed;
        const totalCost = existing.totalCost + cost;
        const successCount = existing.successRate * existing.requestCount + (success ? 1 : 0);

        await aiDb.aiModelUsage.update(existing.id!, {
          requestCount: totalRequests,
          totalTokens,
          totalCost,
          averageResponseTime: (existing.averageResponseTime * existing.requestCount + responseTime) / totalRequests,
          successRate: successCount / totalRequests,
          lastUsed: now,
          updatedAt: now
        });
      } else {
        // 创建新记录
        await aiDb.aiModelUsage.add({
          providerId,
          modelId,
          useCase,
          requestCount: 1,
          totalTokens: tokensUsed,
          totalCost: cost,
          averageResponseTime: responseTime,
          successRate: success ? 1 : 0,
          lastUsed: now,
          createdAt: now,
          updatedAt: now
        });
      }

      console.log('✅ 模型使用记录成功');
    } catch (error) {
      console.error('❌ 记录模型使用失败:', error);
      throw new Error(`记录模型使用失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取模型使用统计
   */
  async getModelUsageStats(providerId?: number): Promise<AIModelUsage[]> {
    try {
      if (providerId) {
        return await aiDb.aiModelUsage.where('providerId').equals(providerId).toArray();
      }
      return await aiDb.aiModelUsage.orderBy('lastUsed').reverse().toArray();
    } catch (error) {
      console.error('❌ 获取模型使用统计失败:', error);
      return [];
    }
  }

  /**
   * 获取最受欢迎的模型
   */
  async getPopularModels(limit: number = 10): Promise<Array<{
    modelId: string;
    totalUsage: number;
    averageCost: number;
    averageResponseTime: number;
  }>> {
    try {
      // 先获取所有使用记录，然后手动排序和限制数量
      const allUsageRecords = await aiDb.aiModelUsage.toArray();
      const stats = allUsageRecords
        .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
        .slice(0, limit);
      const modelStats = new Map<string, {
        usage: number;
        totalCost: number;
        totalResponseTime: number;
        recordCount: number;
      }>();

      for (const record of stats) {
        const existing = modelStats.get(record.modelId) || {
          usage: 0,
          totalCost: 0,
          totalResponseTime: 0,
          recordCount: 0
        };

        modelStats.set(record.modelId, {
          usage: existing.usage + record.requestCount,
          totalCost: existing.totalCost + record.totalCost,
          totalResponseTime: existing.totalResponseTime + (record.averageResponseTime * record.requestCount),
          recordCount: existing.recordCount + 1
        });
      }

      return Array.from(modelStats.entries())
        .map(([modelId, stats]) => ({
          modelId,
          totalUsage: stats.usage,
          averageCost: stats.totalCost / stats.usage,
          averageResponseTime: stats.totalResponseTime / stats.usage
        }))
        .sort((a, b) => b.totalUsage - a.totalUsage)
        .slice(0, limit);
    } catch (error) {
      console.error('❌ 获取热门模型失败:', error);
      return [];
    }
  }

  // ==================== AI模型缓存管理 ====================

  /**
   * 缓存模型数据
   */
  async cacheModelData(
    providerId: number,
    modelId: string,
    modelData: any,
    expiresInHours: number = 24
  ): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

      // 删除现有缓存
      await aiDb.aiModelCache
        .where('providerId')
        .equals(providerId)
        .and((cache: AIModelCache) => cache.modelId === modelId)
        .delete();

      // 添加新缓存
      await aiDb.aiModelCache.add({
        providerId,
        modelId,
        modelData: JSON.stringify(modelData),
        cachedAt: now,
        expiresAt
      });

      console.log('✅ 模型数据缓存成功');
    } catch (error) {
      console.error('❌ 缓存模型数据失败:', error);
      throw new Error(`缓存模型数据失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取缓存的模型数据
   */
  async getCachedModelData(providerId: number, modelId: string): Promise<any | null> {
    try {
      const cache = await aiDb.aiModelCache
        .where('providerId')
        .equals(providerId)
        .and((cache: AIModelCache) => cache.modelId === modelId && cache.expiresAt > new Date())
        .first();

      if (cache) {
        try {
          return JSON.parse(cache.modelData);
        } catch (parseError) {
          console.warn('解析缓存的模型数据失败:', parseError);
          await aiDb.aiModelCache.delete(cache.id!);
        }
      }

      return null;
    } catch (error) {
      console.error('❌ 获取缓存模型数据失败:', error);
      return null;
    }
  }

  /**
   * 清理过期的模型缓存
   */
  async cleanupExpiredCache(): Promise<number> {
    try {
      const deletedCount = await aiDb.aiModelCache
        .where('expiresAt')
        .below(new Date())
        .delete();

      console.log(`✅ 清理过期缓存: 删除了 ${deletedCount} 条记录`);
      return deletedCount;
    } catch (error) {
      console.error('❌ 清理过期缓存失败:', error);
      return 0;
    }
  }

  /**
   * 清除特定提供商的缓存
   */
  async clearProviderCache(providerId: number): Promise<void> {
    try {
      await aiDb.aiModelCache.where('providerId').equals(providerId).delete();
      console.log('✅ 提供商缓存清理成功:', providerId);
    } catch (error) {
      console.error('❌ 清理提供商缓存失败:', error);
      throw new Error(`清理提供商缓存失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ==================== AI功能统计 ====================

  /**
   * 获取AI功能统计信息
   */
  async getAIStatistics(): Promise<{
    providers: {
      total: number;
      enabled: number;
    };
    suggestions: {
      total: number;
      byType: Record<AISuggestion['suggestionType'], number>;
    };
    usage: {
      totalRequests: number;
      totalCost: number;
      averageResponseTime: number;
    };
    cache: {
      totalEntries: number;
      expiredEntries: number;
    };
  }> {
    try {
      const [
        providers,
        suggestions,
        usageRecords,
        cacheEntries
      ] = await Promise.all([
        this.getProviders(),
        aiDb.aiSuggestions.toArray(),
        aiDb.aiModelUsage.toArray(),
        aiDb.aiModelCache.toArray()
      ]);

      const enabledProviders = providers.filter((p: AIProvider) => p.enabled).length;

      const suggestionsByType = suggestions.reduce((acc: Record<AISuggestion['suggestionType'], number>, suggestion: AISuggestion) => {
        acc[suggestion.suggestionType] = (acc[suggestion.suggestionType] || 0) + 1;
        return acc;
      }, {} as Record<AISuggestion['suggestionType'], number>);

      const totalRequests = usageRecords.reduce((sum: number, record: AIModelUsage) => sum + record.requestCount, 0);
      const totalCost = usageRecords.reduce((sum: number, record: AIModelUsage) => sum + record.totalCost, 0);
      const totalResponseTime = usageRecords.reduce((sum: number, record: AIModelUsage) => sum + record.averageResponseTime * record.requestCount, 0);
      const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;

      const now = new Date();
      const expiredCacheCount = cacheEntries.filter((cache: AIModelCache) => cache.expiresAt < now).length;

      return {
        providers: {
          total: providers.length,
          enabled: enabledProviders
        },
        suggestions: {
          total: suggestions.length,
          byType: suggestionsByType
        },
        usage: {
          totalRequests,
          totalCost,
          averageResponseTime
        },
        cache: {
          totalEntries: cacheEntries.length,
          expiredEntries: expiredCacheCount
        }
      };
    } catch (error) {
      console.error('❌ 获取AI统计失败:', error);
      throw new Error(`获取AI统计失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// 导出单例实例
export const aiRepository = AIRepository.getInstance();