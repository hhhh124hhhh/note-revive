/**
 * 统一模型管理器
 * 管理所有AI服务商的模型获取、缓存和推荐
 */

import { ModelInfo, CustomProviderConfig, TestResult, ModelUseCase } from './types';
import { ModelCacheManager } from './ModelCacheManager';
import { ModelRecommendationEngine, RecommendationCriteria } from './ModelRecommendationEngine';
import { ModelProviderWithTest } from './providers/types';

// 导入所有提供商
import { DeepSeekProvider } from './providers/DeepSeekProvider';
import { ZhipuProvider } from './providers/ZhipuProvider';
import { KimiProvider } from './providers/KimiProvider';
import { CustomProvider } from './providers/CustomProvider';

export interface ModelManagerConfig {
  deepSeekEnabled?: boolean;
  zhipuEnabled?: boolean;
  kimiEnabled?: boolean;
  customProviders?: CustomProviderConfig[];
}

export interface ProviderCredentials {
  deepSeek?: string;
  zhipu?: string;
  kimi?: string;
  custom: Record<string, string>; // providerName -> apiKey
}

export class ModelManager {
  private cacheManager: ModelCacheManager;
  private recommendationEngine: ModelRecommendationEngine;
  private providers: Map<string, ModelProviderWithTest> = new Map();
  private customProviders: Map<string, CustomProvider> = new Map();
  private config: ModelManagerConfig;

  constructor(config: ModelManagerConfig = {}) {
    this.cacheManager = new ModelCacheManager();
    this.recommendationEngine = new ModelRecommendationEngine();
    this.config = config;

    this.initializeProviders();
  }

  /**
   * 初始化内置提供商
   */
  private initializeProviders(): void {
    if (this.config.deepSeekEnabled !== false) {
      const deepSeekProvider = new DeepSeekProvider(this.cacheManager);
      this.providers.set('deepseek', deepSeekProvider);
      this.recommendationEngine.registerProvider(deepSeekProvider);
    }

    if (this.config.zhipuEnabled !== false) {
      const zhipuProvider = new ZhipuProvider(this.cacheManager);
      this.providers.set('zhipu', zhipuProvider);
      this.recommendationEngine.registerProvider(zhipuProvider);
    }

    if (this.config.kimiEnabled !== false) {
      const kimiProvider = new KimiProvider(this.cacheManager);
      this.providers.set('kimi', kimiProvider);
      this.recommendationEngine.registerProvider(kimiProvider);
    }

    // 初始化自定义提供商
    if (this.config.customProviders) {
      this.config.customProviders.forEach(config => {
        this.addCustomProvider(config);
      });
    }
  }

  /**
   * 获取所有可用的模型
   */
  async getAllModels(credentials: ProviderCredentials): Promise<{
    provider: string;
    models: ModelInfo[];
    error?: string;
  }[]> {
    const results: {
      provider: string;
      models: ModelInfo[];
      error?: string;
    }[] = [];

    // 获取内置提供商模型
    for (const [providerType, provider] of this.providers) {
      try {
        const apiKey = this.getProviderApiKey(providerType, credentials);
        if (!apiKey) {
          results.push({
            provider: provider.name,
            models: [],
            error: '缺少API密钥'
          });
          continue;
        }

        const models = await provider.getModels(apiKey);
        results.push({
          provider: provider.name,
          models
        });
      } catch (error) {
        results.push({
          provider: provider.name,
          models: [],
          error: error instanceof Error ? error.message : '获取失败'
        });
      }
    }

    // 获取自定义提供商模型
    for (const [providerName, provider] of this.customProviders) {
      try {
        const apiKey = credentials.custom[providerName];
        if (!apiKey) {
          results.push({
            provider: providerName,
            models: [],
            error: '缺少API密钥'
          });
          continue;
        }

        const models = await provider.getModels(apiKey);
        results.push({
          provider: providerName,
          models
        });
      } catch (error) {
        results.push({
          provider: providerName,
          models: [],
          error: error instanceof Error ? error.message : '获取失败'
        });
      }
    }

    return results;
  }

  /**
   * 获取指定提供商的模型
   */
  async getProviderModels(
    providerType: string,
    credentials: ProviderCredentials
  ): Promise<ModelInfo[]> {
    const provider = this.providers.get(providerType) || this.customProviders.get(providerType);
    if (!provider) {
      throw new Error(`未找到提供商: ${providerType}`);
    }

    const apiKey = this.getProviderApiKey(providerType, credentials);
    if (!apiKey) {
      throw new Error(`缺少 ${providerType} 的API密钥`);
    }

    return await provider.getModels(apiKey);
  }

  /**
   * 测试提供商连接
   */
  async testProviderConnection(
    providerType: string,
    credentials: ProviderCredentials
  ): Promise<TestResult> {
    const provider = this.providers.get(providerType) || this.customProviders.get(providerType);
    if (!provider) {
      throw new Error(`未找到提供商: ${providerType}`);
    }

    const apiKey = this.getProviderApiKey(providerType, credentials);
    if (!apiKey) {
      throw new Error(`缺少 ${providerType} 的API密钥`);
    }

    return await provider.testConnection(apiKey);
  }

  /**
   * 验证API密钥
   */
  async validateApiKey(providerType: string, apiKey: string): Promise<boolean> {
    const provider = this.providers.get(providerType) || this.customProviders.get(providerType);
    if (!provider) {
      throw new Error(`未找到提供商: ${providerType}`);
    }

    return await provider.validateApiKey(apiKey);
  }

  /**
   * 获取模型推荐
   */
  async getRecommendedModel(
    criteria: RecommendationCriteria,
    credentials: ProviderCredentials
  ): Promise<ModelInfo | null> {
    // 临时设置凭据到推荐引擎
    // 实际实现中可能需要更复杂的凭据管理
    try {
      const result = await this.recommendationEngine.recommend(criteria);
      return result?.recommended || null;
    } catch (error) {
      console.error('获取模型推荐失败:', error);
      return null;
    }
  }

  /**
   * 添加自定义提供商
   */
  addCustomProvider(config: CustomProviderConfig): void {
    const provider = new CustomProvider(this.cacheManager, config);
    this.customProviders.set(config.name, provider);
    this.recommendationEngine.registerProvider(provider);
  }

  /**
   * 移除自定义提供商
   */
  removeCustomProvider(providerName: string): void {
    this.customProviders.delete(providerName);
  }

  /**
   * 更新自定义提供商配置
   */
  updateCustomProvider(providerName: string, config: CustomProviderConfig): void {
    const provider = this.customProviders.get(providerName);
    if (provider) {
      provider.updateConfig(config);
    }
  }

  /**
   * 获取所有提供商信息
   */
  getProviders(): Array<{
    type: string;
    name: string;
    isCustom: boolean;
    config?: CustomProviderConfig;
  }> {
    const providers: Array<{
      type: string;
      name: string;
      isCustom: boolean;
      config?: CustomProviderConfig;
    }> = [];

    // 内置提供商
    for (const [type, provider] of this.providers) {
      providers.push({
        type,
        name: provider.name,
        isCustom: false
      });
    }

    // 自定义提供商
    for (const [name, provider] of this.customProviders) {
      providers.push({
        type: name,
        name,
        isCustom: true,
        config: provider.getConfig()
      });
    }

    return providers;
  }

  /**
   * 清除缓存
   */
  clearCache(providerType?: string): void {
    if (providerType) {
      this.cacheManager.clearProviderCache(providerType);
    } else {
      this.cacheManager.clearAllCache();
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): any {
    return this.cacheManager.getCacheStats();
  }

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache(): void {
    this.cacheManager.clearExpiredCache();
  }

  /**
   * 根据使用场景获取所有推荐的模型
   */
  async getModelsByUseCase(useCase: ModelUseCase): Promise<ModelInfo[]> {
    const models: ModelInfo[] = [];

    // 从内置提供商获取推荐模型
    for (const provider of this.providers.values()) {
      const model = provider.getRecommendedModel(useCase);
      if (model) {
        models.push(model);
      }
    }

    // 从自定义提供商获取推荐模型
    for (const provider of this.customProviders.values()) {
      const model = provider.getRecommendedModel(useCase);
      if (model) {
        models.push(model);
      }
    }

    return models;
  }

  /**
   * 搜索模型
   */
  async searchModels(
    query: string,
    credentials: ProviderCredentials
  ): Promise<Array<{
    provider: string;
    model: ModelInfo;
    relevanceScore: number;
  }>> {
    const allModels = await this.getAllModels(credentials);
    const results: Array<{
      provider: string;
      model: ModelInfo;
      relevanceScore: number;
    }> = [];

    const queryLower = query.toLowerCase();

    for (const { provider, models } of allModels) {
      for (const model of models) {
        let relevanceScore = 0;

        // 搜索模型ID
        if (model.id.toLowerCase().includes(queryLower)) {
          relevanceScore += 10;
        }

        // 搜索模型名称
        if (model.name.toLowerCase().includes(queryLower)) {
          relevanceScore += 8;
        }

        // 搜索描述
        if (model.description.toLowerCase().includes(queryLower)) {
          relevanceScore += 5;
        }

        // 搜索能力标签
        for (const capability of model.capabilities) {
          if (capability.toLowerCase().includes(queryLower)) {
            relevanceScore += 3;
            break;
          }
        }

        if (relevanceScore > 0) {
          results.push({
            provider,
            model,
            relevanceScore
          });
        }
      }
    }

    // 按相关性排序
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * 获取提供商API密钥
   */
  private getProviderApiKey(providerType: string, credentials: ProviderCredentials): string | undefined {
    switch (providerType) {
      case 'deepseek':
        return credentials.deepSeek;
      case 'zhipu':
        return credentials.zhipu;
      case 'kimi':
        return credentials.kimi;
      default:
        return credentials.custom[providerType];
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ModelManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // 重新初始化提供商
    if (newConfig.customProviders) {
      // 清除现有自定义提供商
      this.customProviders.clear();

      // 添加新的自定义提供商
      newConfig.customProviders.forEach(config => {
        this.addCustomProvider(config);
      });
    }
  }

  /**
   * 获取配置
   */
  getConfig(): ModelManagerConfig {
    return { ...this.config };
  }
}