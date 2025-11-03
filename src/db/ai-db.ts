import Dexie, { Table } from 'dexie';

// AI建议表接口
export interface AISuggestion {
  id?: number;
  noteId: string;
  relatedNotes: string; // JSON数组存储相关便签ID
  searchKeywords: string; // JSON数组存储语义关键词
  lastAnalyzed: Date;
  confidence: number;
  suggestionType: 'search' | 'relation' | 'reminder';
}

// AI提供商配置表
export interface AIProvider {
  id?: number;
  name: string;
  type: 'deepseek' | 'zhipu' | 'kimi' | 'custom';
  enabled: boolean;
  apiKey?: string; // 加密存储
  config?: string; // JSON字符串存储自定义配置
  selectedModel?: string; // 当前选择的模型
  createdAt: Date;
  updatedAt: Date;
  lastTested?: Date;
  testStatus?: 'success' | 'failed' | 'pending';
  testMessage?: string;
}

// AI模型使用记录表
export interface AIModelUsage {
  id?: number;
  providerId: number;
  modelId: string;
  useCase: 'search' | 'relation' | 'reminder' | 'general';
  requestCount: number;
  totalTokens: number;
  totalCost: number; // USD
  averageResponseTime: number; // 毫秒
  successRate: number; // 0-1
  lastUsed: Date;
  createdAt: Date;
  updatedAt: Date;
}

// AI模型缓存表
export interface AIModelCache {
  id?: number;
  providerId: number;
  modelId: string;
  modelData: string; // JSON字符串存储模型信息
  cachedAt: Date;
  expiresAt: Date;
}

/**
 * Note Revive AI功能数据库
 * 专门处理AI相关的所有功能，与核心数据库完全分离
 */
export class NoteReviveAIDB extends Dexie {
  // AI功能表
  aiSuggestions!: Table<AISuggestion, number>;
  aiProviders!: Table<AIProvider, number>;
  aiModelUsage!: Table<AIModelUsage, number>;
  aiModelCache!: Table<AIModelCache, number>;

  constructor() {
    super('NoteReviveAIDB');

    // AI数据库版本管理
    const AI_DB_VERSIONS = {
      V1_BASIC: 1,       // 基础AI功能
      V2_ENHANCED: 2,    // 增强AI功能
      V3_OPTIMIZED: 3    // 性能优化
    };

    // 版本1：基础AI功能
    this.version(AI_DB_VERSIONS.V1_BASIC).stores({
      aiSuggestions: '++id, noteId, suggestionType, lastAnalyzed',
      aiProviders: '++id, type, enabled, name, lastTested, createdAt, updatedAt',
      aiModelUsage: '++id, providerId, modelId, useCase, lastUsed',
      aiModelCache: '++id, providerId, modelId, expiresAt'
    }).upgrade(async tx => {
      console.log('🔄 AI数据库初始化版本1...');
      await this.initDefaultProviders();
    });

    // 版本2：增强AI功能
    this.version(AI_DB_VERSIONS.V2_ENHANCED).stores({
      aiSuggestions: '++id, noteId, suggestionType, lastAnalyzed, [noteId+suggestionType]',
      aiProviders: '++id, type, enabled, name, lastTested, createdAt, updatedAt',
      aiModelUsage: '++id, providerId, modelId, useCase, lastUsed, [providerId+modelId]',
      aiModelCache: '++id, providerId, modelId, expiresAt, [providerId+modelId]'
    }).upgrade(async tx => {
      console.log('🔄 AI数据库升级到版本2：增强索引优化...');
      await this.validateAndCleanAIData(tx);
    });

    // 版本3：性能优化
    this.version(AI_DB_VERSIONS.V3_OPTIMIZED).stores({
      aiSuggestions: '++id, noteId, suggestionType, lastAnalyzed, [noteId+suggestionType], [lastAnalyzed+suggestionType]',
      aiProviders: '++id, type, enabled, name, lastTested, createdAt, updatedAt, [enabled+type]',
      aiModelUsage: '++id, providerId, modelId, useCase, lastUsed, [providerId+modelId], [useCase+lastUsed]',
      aiModelCache: '++id, providerId, modelId, expiresAt, [providerId+modelId], [expiresAt]'
    }).upgrade(async tx => {
      console.log('🔄 AI数据库升级到版本3：性能优化...');
      await this.performDataOptimization(tx);
    });

    // 错误处理
    this.open().catch(async error => {
      console.error('🚨 AI数据库打开失败:', error);

      const errorInfo = this.classifyError(error);
      if (errorInfo.canAutoRecover) {
        try {
          await this.attemptAutoRecovery(errorInfo);
          console.log('✅ AI数据库自动恢复成功');
        } catch (recoveryError) {
          console.error('❌ AI数据库自动恢复失败:', recoveryError);
          // AI数据库失败不应该影响核心功能，降级到无AI模式
          console.warn('⚠️ AI功能暂时不可用，应用将继续运行');
        }
      } else {
        console.warn('⚠️ AI功能暂时不可用，应用将继续运行');
      }
    });
  }

  // 初始化默认AI提供商
  private async initDefaultProviders(): Promise<void> {
    const defaultProviders: Omit<AIProvider, 'id'>[] = [
      {
        name: 'DeepSeek',
        type: 'deepseek',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '智谱AI',
        type: 'zhipu',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Kimi',
        type: 'kimi',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const defaultProvider of defaultProviders) {
      const existingProvider = await this.aiProviders.where('type').equals(defaultProvider.type).first();
      if (!existingProvider) {
        await this.aiProviders.add(defaultProvider);
        console.log(`创建了默认AI提供商: ${defaultProvider.name}`);
      }
    }
  }

  // 数据验证和清理
  private async validateAndCleanAIData(tx: any): Promise<void> {
    console.log('🔍 验证AI数据完整性...');

    // 验证AI提供商
    const providers = await tx.table('aiProviders').toArray();
    for (const provider of providers) {
      if (!provider.name || !provider.type) {
        console.warn('发现无效的AI提供商记录:', provider);
        await tx.table('aiProviders').delete(provider.id);
      }
    }

    // 验证使用统计
    const usageRecords = await tx.table('aiModelUsage').toArray();
    for (const record of usageRecords) {
      if (record.successRate < 0 || record.successRate > 1) {
        console.warn('发现无效的使用统计记录:', record);
        await tx.table('aiModelUsage').delete(record.id);
      }
    }

    console.log('✅ AI数据验证完成');
  }

  // 数据优化
  private async performDataOptimization(tx: any): Promise<void> {
    console.log('🚀 执行AI数据库优化...');

    // 清理过期数据
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 清理过期的AI建议
    await tx.table('aiSuggestions')
      .where('lastAnalyzed')
      .below(thirtyDaysAgo)
      .delete();

    // 清理过期的模型缓存
    await tx.table('aiModelCache')
      .where('expiresAt')
      .below(now)
      .delete();

    console.log('✅ AI数据库优化完成');
  }

  // 错误分类
  private classifyError(error: any): { canAutoRecover: boolean; type: string } {
    if (error.name === 'QuotaExceededError') {
      return { canAutoRecover: true, type: 'QUOTA_ERROR' };
    }
    return { canAutoRecover: false, type: 'OTHER_ERROR' };
  }

  // 自动恢复
  private async attemptAutoRecovery(errorInfo: any): Promise<void> {
    if (errorInfo.type === 'QUOTA_ERROR') {
      console.log('🧹 清理AI数据库缓存...');

      // 激进清理策略 - AI功能失败不影响核心功能
      await this.aiModelCache.clear();

      // 清理旧的AI建议
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await this.aiSuggestions
        .where('lastAnalyzed')
        .below(sevenDaysAgo)
        .delete();
    }
  }

  // 健康检查
  async performHealthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    details: any;
  }> {
    try {
      const [
        suggestionCount,
        providerCount,
        cacheCount,
        usageCount
      ] = await Promise.all([
        this.aiSuggestions.count(),
        this.aiProviders.count(),
        this.aiModelCache.count(),
        this.aiModelUsage.count()
      ]);

      // 估算数据库大小
      const totalRecords = suggestionCount + providerCount + cacheCount + usageCount;

      // 清理过期缓存
      const expiredCache = await this.aiModelCache
        .where('expiresAt')
        .below(new Date())
        .delete();

      return {
        status: totalRecords > 10000 ? 'warning' : 'healthy',
        details: {
          suggestionCount,
          providerCount,
          cacheCount: cacheCount - expiredCache, // 清理后的数量
          usageCount,
          totalRecords,
          expiredCacheCleaned: expiredCache
        }
      };
    } catch (error) {
      console.error('AI数据库健康检查失败:', error);
      return {
        status: 'error',
        details: { error: (error as Error).message }
      };
    }
  }
}

// 创建AI数据库实例
export const aiDb = new NoteReviveAIDB();