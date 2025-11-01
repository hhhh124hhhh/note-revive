/**
 * 模型缓存管理器
 * 负责缓存各AI服务商的模型列表，避免重复请求
 */

import { ModelInfo, CachedModelList } from './types';

export class ModelCacheManager {
  private cache = new Map<string, CachedModelList>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

  /**
   * 获取缓存的模型列表
   * @param provider 服务商类型
   * @param apiKey API密钥
   * @returns 缓存的模型列表或null
   */
  getCachedModels(provider: string, apiKey: string): ModelInfo[] | null {
    const cacheKey = this.generateCacheKey(provider, apiKey);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.models;
    }

    return null;
  }

  /**
   * 缓存模型列表
   * @param provider 服务商类型
   * @param apiKey API密钥
   * @param models 模型列表
   */
  cacheModels(provider: string, apiKey: string, models: ModelInfo[]): void {
    const cacheKey = this.generateCacheKey(provider, apiKey);

    this.cache.set(cacheKey, {
      models,
      timestamp: Date.now(),
      provider
    });
  }

  /**
   * 生成缓存键
   * @param provider 服务商类型
   * @param apiKey API密钥
   * @returns 缓存键
   */
  private generateCacheKey(provider: string, apiKey: string): string {
    // 使用API密钥的前10个字符和提供商类型生成缓存键
    const apiKeyPrefix = apiKey.substring(0, 10);
    return `${provider}:${apiKeyPrefix}`;
  }

  /**
   * 清除特定服务商的缓存
   * @param provider 服务商类型
   */
  clearProviderCache(provider?: string): void {
    if (provider) {
      // 清除特定服务商的缓存
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${provider}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      // 清除所有缓存
      this.cache.clear();
    }
  }

  /**
   * 清除过期缓存
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    totalEntries: number;
    entries: Array<{
      provider: string;
      modelCount: number;
      cacheAge: number;
      isExpired: boolean;
    }>;
  } {
    const stats = {
      totalEntries: this.cache.size,
      entries: [] as Array<{
        provider: string;
        modelCount: number;
        cacheAge: number;
        isExpired: boolean;
      }>
    };

    for (const [key, cached] of this.cache.entries()) {
      const cacheAge = Date.now() - cached.timestamp;
      stats.entries.push({
        provider: cached.provider,
        modelCount: cached.models.length,
        cacheAge,
        isExpired: cacheAge >= this.CACHE_DURATION
      });
    }

    return stats;
  }

  /**
   * 清理所有缓存
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * 检查缓存是否有效
   * @param provider 服务商类型
   * @param apiKey API密钥
   * @returns 是否有效
   */
  isCacheValid(provider: string, apiKey: string): boolean {
    const cached = this.getCachedModels(provider, apiKey);
    return cached !== null;
  }
}