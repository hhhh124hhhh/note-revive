import { coreDb, NoteReviveCoreDB } from './core-db';
import { aiDb, NoteReviveAIDB, AISuggestion, AIProvider } from './ai-db';
import { Note as NoteType } from '../types';

/**
 * 数据库管理器 - 统一管理核心数据库和AI数据库
 * 提供事务管理和数据一致性保证
 */
export class DatabaseManager {
  private static instance: DatabaseManager;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  // 检查数据库状态
  async checkHealth(): Promise<{
    core: { status: 'healthy' | 'warning' | 'error'; details: any };
    ai: { status: 'healthy' | 'warning' | 'error'; details: any };
    overall: 'healthy' | 'warning' | 'error';
  }> {
    const [coreHealth, aiHealth] = await Promise.allSettled([
      this.checkCoreHealth(),
      aiDb.performHealthCheck()
    ]);

    const coreResult = coreHealth.status === 'fulfilled' ? coreHealth.value : {
      status: 'error' as const,
      details: { error: coreHealth.reason?.message || 'Unknown error' }
    };

    const aiResult = aiHealth.status === 'fulfilled' ? aiHealth.value : {
      status: 'error' as const,
      details: { error: aiHealth.reason?.message || 'Unknown error' }
    };

    // 整体状态判断
    let overall: 'healthy' | 'warning' | 'error';
    if (coreResult.status === 'error' || aiResult.status === 'error') {
      overall = 'error';
    } else if (coreResult.status === 'warning' || aiResult.status === 'warning') {
      overall = 'warning';
    } else {
      overall = 'healthy';
    }

    return {
      core: coreResult,
      ai: aiResult,
      overall
    };
  }

  private async checkCoreHealth(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    details: any;
  }> {
    try {
      const [
        noteCount,
        tagCount,
        settingsCount
      ] = await Promise.all([
        coreDb.notes.count(),
        coreDb.tags.count(),
        coreDb.settings.count()
      ]);

      const totalRecords = noteCount + tagCount + settingsCount;

      return {
        status: totalRecords > 50000 ? 'warning' : 'healthy',
        details: {
          noteCount,
          tagCount,
          settingsCount,
          totalRecords
        }
      };
    } catch (error) {
      console.error('核心数据库健康检查失败:', error);
      return {
        status: 'error',
        details: { error: (error as Error).message }
      };
    }
  }

  // 跨数据库事务支持
  async performCrossDatabaseTransaction<T>(
    operations: {
      core?: (db: NoteReviveCoreDB) => Promise<any>;
      ai?: (db: NoteReviveAIDB) => Promise<any>;
    }
  ): Promise<T> {
    const results: any = {};

    try {
      // 先执行核心数据库操作
      if (operations.core) {
        results.core = await coreDb.transaction('rw', coreDb.notes, coreDb.tags, async () => {
          return await operations.core!(coreDb);
        });
      }

      // 再执行AI数据库操作
      if (operations.ai) {
        results.ai = await aiDb.transaction('rw', aiDb.aiSuggestions, aiDb.aiProviders, async () => {
          return await operations.ai!(aiDb);
        });
      }

      return results;
    } catch (error) {
      console.error('跨数据库事务失败:', error);
      throw error;
    }
  }

  // AI功能相关的复合操作
  async createNoteWithAISuggestions(
    note: NoteType,
    suggestions?: Omit<AISuggestion, 'id'>[]
  ): Promise<{ noteId: string; suggestionIds?: number[] }> {
    return this.performCrossDatabaseTransaction({
      core: async (db) => {
        return await db.notes.add(note);
      },
      ai: async (db) => {
        if (suggestions && suggestions.length > 0) {
          return await db.aiSuggestions.bulkAdd(suggestions);
        }
        return [];
      }
    });
  }

  // 删除便签时同时清理相关AI数据
  async deleteNoteWithAIData(noteId: string): Promise<void> {
    return this.performCrossDatabaseTransaction({
      core: async (db) => {
        return await db.notes.delete(noteId);
      },
      ai: async (db) => {
        // 删除相关的AI建议
        return await db.aiSuggestions
          .where('noteId')
          .equals(noteId)
          .delete();
      }
    });
  }

  // 获取便签及其AI建议
  async getNoteWithSuggestions(noteId: string): Promise<{
    note?: NoteType;
    suggestions: AISuggestion[];
  }> {
    try {
      const [note, suggestions] = await Promise.all([
        coreDb.notes.get(noteId),
        aiDb.aiSuggestions.where('noteId').equals(noteId).toArray()
      ]);

      return {
        note,
        suggestions
      };
    } catch (error) {
      console.error('获取便签和AI建议失败:', error);
      throw error;
    }
  }

  // AI提供商管理
  async getAIProviders(): Promise<AIProvider[]> {
    try {
      return await aiDb.aiProviders.orderBy('createdAt').toArray();
    } catch (error) {
      console.error('获取AI提供商失败:', error);
      return [];
    }
  }

  async updateAIProvider(id: number, updates: Partial<AIProvider>): Promise<void> {
    try {
      await aiDb.aiProviders.update(id, {
        ...updates,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('更新AI提供商失败:', error);
      throw error;
    }
  }

  // AI建议管理
  async saveAISuggestions(suggestions: Omit<AISuggestion, 'id'>[]): Promise<number[]> {
    try {
      if (suggestions.length === 0) {
        return [];
      }
      const ids = await aiDb.aiSuggestions.bulkAdd(suggestions);
      // 返回ID数组（这里简单地返回从1开始的连续数字，实际应用中可能需要更好的方法）
      return Array.from({ length: suggestions.length }, (_, i) => ids + i);
    } catch (error) {
      console.error('保存AI建议失败:', error);
      throw error;
    }
  }

  async getAISuggestions(noteId: string): Promise<AISuggestion[]> {
    try {
      return await aiDb.aiSuggestions
        .where('noteId')
        .equals(noteId)
        .toArray();
    } catch (error) {
      console.error('获取AI建议失败:', error);
      return [];
    }
  }

  // 数据清理
  async cleanupOldData(): Promise<{
    core: { deletedRecords: number };
    ai: { deletedRecords: number };
  }> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [coreDeleted, aiDeleted] = await Promise.allSettled([
      // 清理旧的活动记录
      coreDb.activities
        .where('timestamp')
        .below(thirtyDaysAgo)
        .delete(),

      // 清理过期的AI建议和缓存
      Promise.all([
        aiDb.aiSuggestions
          .where('lastAnalyzed')
          .below(sevenDaysAgo)
          .delete(),
        aiDb.aiModelCache
          .where('expiresAt')
          .below(now)
          .delete()
      ]).then(results => results.reduce((sum, count) => sum + count, 0))
    ]);

    return {
      core: {
        deletedRecords: coreDeleted.status === 'fulfilled' ? coreDeleted.value : 0
      },
      ai: {
        deletedRecords: aiDeleted.status === 'fulfilled' ? aiDeleted.value : 0
      }
    };
  }

  // 数据备份
  async createBackup(): Promise<{
    core: any;
    ai: any;
    timestamp: string;
    version: string;
  }> {
    try {
      const [coreBackup, aiBackup] = await Promise.all([
        // 核心数据备份
        (async () => {
          const [notes, tags, settings, activities] = await Promise.all([
            coreDb.notes.limit(1000).toArray(), // 限制数量防止过大
            coreDb.tags.toArray(),
            coreDb.settings.toArray(),
            coreDb.activities.limit(500).toArray()
          ]);

          return { notes, tags, settings, activities };
        })(),

        // AI数据备份
        (async () => {
          const [providers, suggestions, usage] = await Promise.all([
            aiDb.aiProviders.toArray(),
            aiDb.aiSuggestions.limit(500).toArray(),
            aiDb.aiModelUsage.limit(200).toArray()
          ]);

          return { providers, suggestions, usage };
        })()
      ]);

      return {
        core: coreBackup,
        ai: aiBackup,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };
    } catch (error) {
      console.error('创建备份失败:', error);
      throw error;
    }
  }

  // 数据恢复
  async restoreFromBackup(backup: any): Promise<void> {
    try {
      // 恢复核心数据
      if (backup.core) {
        await coreDb.transaction('rw', coreDb.notes, coreDb.tags, coreDb.settings, coreDb.activities, async () => {
          if (backup.core.notes?.length > 0) {
            await coreDb.notes.bulkPut(backup.core.notes);
          }
          if (backup.core.tags?.length > 0) {
            await coreDb.tags.bulkPut(backup.core.tags);
          }
          if (backup.core.settings?.length > 0) {
            await coreDb.settings.bulkPut(backup.core.settings);
          }
          if (backup.core.activities?.length > 0) {
            await coreDb.activities.bulkPut(backup.core.activities);
          }
        });
      }

      // 恢复AI数据
      if (backup.ai) {
        await aiDb.transaction('rw', aiDb.aiProviders, aiDb.aiSuggestions, aiDb.aiModelUsage, async () => {
          if (backup.ai.providers?.length > 0) {
            await aiDb.aiProviders.bulkPut(backup.ai.providers);
          }
          if (backup.ai.suggestions?.length > 0) {
            await aiDb.aiSuggestions.bulkPut(backup.ai.suggestions);
          }
          if (backup.ai.usage?.length > 0) {
            await aiDb.aiModelUsage.bulkPut(backup.ai.usage);
          }
        });
      }

      console.log('✅ 数据恢复完成');
    } catch (error) {
      console.error('数据恢复失败:', error);
      throw error;
    }
  }

  // 获取数据库统计信息
  async getStats(): Promise<{
    core: {
      notes: number;
      tags: number;
      activities: number;
      settings: number;
      shortcuts: number;
    };
    ai: {
      providers: number;
      suggestions: number;
      usage: number;
      cache: number;
    };
    total: number;
  }> {
    const [
      coreStats,
      aiStats
    ] = await Promise.all([
      // 核心数据统计
      (async () => {
        const [notes, tags, activities, settings, shortcuts] = await Promise.all([
          coreDb.notes.count(),
          coreDb.tags.count(),
          coreDb.activities.count(),
          coreDb.settings.count(),
          coreDb.customShortcuts.count()
        ]);

        return { notes, tags, activities, settings, shortcuts };
      })(),

      // AI数据统计
      (async () => {
        const [providers, suggestions, usage, cache] = await Promise.all([
          aiDb.aiProviders.count(),
          aiDb.aiSuggestions.count(),
          aiDb.aiModelUsage.count(),
          aiDb.aiModelCache.count()
        ]);

        return { providers, suggestions, usage, cache };
      })()
    ]);

    const total = Object.values(coreStats).reduce((sum, count) => sum + count, 0) +
                  Object.values(aiStats).reduce((sum, count) => sum + count, 0);

    return {
      core: coreStats,
      ai: aiStats,
      total
    };
  }
}

// 导出单例实例
export const databaseManager = DatabaseManager.getInstance();