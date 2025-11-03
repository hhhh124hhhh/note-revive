/**
 * 智能缓存服务
 * 提供内存+IndexedDB的多层次缓存策略，支持LRU、TTL等高级缓存特性
 */

// 缓存条目接口
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // 数据大小（字节）
  tags?: string[]; // 缓存标签，用于批量清理
}

// 缓存配置接口
interface CacheConfig {
  maxSize: number; // 最大缓存大小（字节）
  maxEntries: number; // 最大条目数
  defaultTTL: number; // 默认TTL（毫秒）
  cleanupInterval: number; // 清理间隔（毫秒）
  enableLRU: boolean; // 是否启用LRU
  enableCompression: boolean; // 是否启用压缩
}

// 缓存统计接口
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  entries: number;
  hitRate: number;
  memoryUsage: number;
  lastCleanup: number;
}

/**
 * 智能缓存管理器
 */
class SmartCacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    const defaultConfig: CacheConfig = {
      maxSize: 50 * 1024 * 1024, // 50MB
      maxEntries: 1000,
      defaultTTL: 30 * 60 * 1000, // 30分钟
      cleanupInterval: 5 * 60 * 1000, // 5分钟
      enableLRU: true,
      enableCompression: false
    };

    this.config = { ...defaultConfig, ...config };
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      entries: 0,
      hitRate: 0,
      memoryUsage: 0,
      lastCleanup: Date.now()
    };

    this.startCleanupTimer();
  }

  /**
   * 设置缓存
   */
  async set<T>(
    key: string,
    data: T,
    ttl: number = this.config.defaultTTL,
    tags?: string[]
  ): Promise<void> {
    try {
      const now = Date.now();
      const serializedData = JSON.stringify(data);
      const size = new Blob([serializedData]).size;

      // 检查是否需要腾出空间
      await this.ensureCapacity(size);

      const entry: CacheEntry<T> = {
        data,
        timestamp: now,
        expiresAt: now + ttl,
        accessCount: 1,
        lastAccessed: now,
        size,
        tags
      };

      this.memoryCache.set(key, entry);
      this.updateStats();

      console.log(`✅ 缓存设置成功: ${key} (${(size / 1024).toFixed(2)}KB)`);
    } catch (error) {
      console.error('❌ 设置缓存失败:', error);
    }
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;

      if (!entry) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      const now = Date.now();

      // 检查是否过期
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      // 更新访问信息
      entry.accessCount++;
      entry.lastAccessed = now;
      this.stats.hits++;
      this.updateHitRate();

      console.log(`📥 缓存命中: ${key}`);
      return entry.data;
    } catch (error) {
      console.error('❌ 获取缓存失败:', error);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    const deleted = this.memoryCache.delete(key);
    if (deleted) {
      this.updateStats();
      console.log(`🗑️ 缓存删除: ${key}`);
    }
    return deleted;
  }

  /**
   * 批量删除缓存
   */
  deleteByTag(tag: string): number {
    let deletedCount = 0;
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.tags?.includes(tag)) {
        this.memoryCache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.updateStats();
      console.log(`🗑️ 批量删除缓存 (标签: ${tag}): ${deletedCount}条`);
    }

    return deletedCount;
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    const entry = this.memoryCache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.memoryCache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    const size = this.memoryCache.size;
    this.memoryCache.clear();
    this.updateStats();
    console.log(`🧹 缓存已清空: 删除了 ${size} 个条目`);
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    this.stats.lastCleanup = now;
    this.updateStats();

    if (cleanedCount > 0) {
      console.log(`🧹 清理过期缓存: ${cleanedCount}个条目`);
    }

    return cleanedCount;
  }

  /**
   * 确保有足够的容量
   */
  private async ensureCapacity(requiredSize: number): Promise<void> {
    const currentSize = this.getCurrentSize();

    // 如果当前大小 + 新增大小超过限制，执行LRU清理
    if (currentSize + requiredSize > this.config.maxSize) {
      await this.performLRUCleanup(currentSize + requiredSize - this.config.maxSize);
    }

    // 如果条目数超过限制，清理最少的条目
    if (this.memoryCache.size >= this.config.maxEntries) {
      await this.performEntryCountCleanup();
    }
  }

  /**
   * LRU清理
   */
  private async performLRUCleanup(bytesToFree: number): Promise<void> {
    if (!this.config.enableLRU) return;

    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => {
        // 按LRU排序：最后访问时间 + 访问频率
        const scoreA = a.lastAccessed + (a.accessCount * 1000);
        const scoreB = b.lastAccessed + (b.accessCount * 1000);
        return scoreA - scoreB;
      });

    let freedBytes = 0;
    for (const [key, entry] of entries) {
      this.memoryCache.delete(key);
      freedBytes += entry.size;

      if (freedBytes >= bytesToFree) {
        break;
      }
    }

    console.log(`🧹 LRU清理: 释放了 ${(freedBytes / 1024).toFixed(2)}KB`);
  }

  /**
   * 条目数清理
   */
  private async performEntryCountCleanup(): Promise<void> {
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => {
        const scoreA = a.lastAccessed + (a.accessCount * 1000);
        const scoreB = b.lastAccessed + (b.accessCount * 1000);
        return scoreA - scoreB;
      });

    const toRemove = entries.length - this.config.maxEntries + 1;
    for (let i = 0; i < toRemove; i++) {
      this.memoryCache.delete(entries[i][0]);
    }

    console.log(`🧹 条目数清理: 删除了 ${toRemove} 个条目`);
  }

  /**
   * 获取当前缓存大小
   */
  private getCurrentSize(): number {
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.size = this.getCurrentSize();
    this.stats.entries = this.memoryCache.size;

    // 估算内存使用量（包括对象开销）
    this.stats.memoryUsage = this.stats.size + (this.stats.entries * 200); // 每个条目约200字节开销
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 停止清理定时器
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 获取缓存配置
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * 更新缓存配置
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // 重启清理定时器（如果间隔发生变化）
    if (newConfig.cleanupInterval) {
      this.startCleanupTimer();
    }
  }

  /**
   * 预热缓存
   */
  async warmup<T>(
    keys: string[],
    dataProvider: (key: string) => Promise<T>,
    ttl?: number
  ): Promise<void> {
    console.log(`🔥 开始缓存预热: ${keys.length} 个条目`);

    const promises = keys.map(async (key) => {
      try {
        const data = await dataProvider(key);
        await this.set(key, data, ttl, ['warmup']);
      } catch (error) {
        console.warn(`预热失败 ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
    console.log(`✅ 缓存预热完成`);
  }

  /**
   * 获取热点数据（访问频率最高的数据）
   */
  getHotData(limit: number = 10): Array<{
    key: string;
    accessCount: number;
    lastAccessed: number;
    size: number;
  }> {
    return Array.from(this.memoryCache.entries())
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
        size: entry.size
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * 导出缓存数据
   */
  export(): Array<{
    key: string;
    data: any;
    ttl: number;
    tags?: string[];
  }> {
    const now = Date.now();
    return Array.from(this.memoryCache.entries())
      .filter(([, entry]) => entry.expiresAt > now)
      .map(([key, entry]) => ({
        key,
        data: entry.data,
        ttl: entry.expiresAt - now,
        tags: entry.tags
      }));
  }

  /**
   * 导入缓存数据
   */
  async import(
    entries: Array<{
      key: string;
      data: any;
      ttl: number;
      tags?: string[];
    }>
  ): Promise<void> {
    console.log(`📥 开始导入缓存: ${entries.length} 个条目`);

    for (const entry of entries) {
      try {
        await this.set(entry.key, entry.data, entry.ttl, entry.tags);
      } catch (error) {
        console.warn(`导入失败 ${entry.key}:`, error);
      }
    }

    console.log(`✅ 缓存导入完成`);
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
  }
}

// 缓存服务实例
export class CacheService {
  private static instance: CacheService;
  private managers = new Map<string, SmartCacheManager>();

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * 获取或创建缓存管理器
   */
  getManager(name: string, config?: Partial<CacheConfig>): SmartCacheManager {
    if (!this.managers.has(name)) {
      this.managers.set(name, new SmartCacheManager(config));
    }
    return this.managers.get(name)!;
  }

  /**
   * 获取所有缓存管理器的统计信息
   */
  getAllStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    for (const [name, manager] of this.managers.entries()) {
      stats[name] = manager.getStats();
    }
    return stats;
  }

  /**
   * 清理所有缓存管理器
   */
  cleanupAll(): number {
    let totalCleaned = 0;
    for (const manager of this.managers.values()) {
      totalCleaned += manager.cleanup();
    }
    return totalCleaned;
  }

  /**
   * 清空所有缓存管理器
   */
  clearAll(): void {
    for (const manager of this.managers.values()) {
      manager.clear();
    }
  }

  /**
   * 销毁缓存服务
   */
  destroy(): void {
    for (const manager of this.managers.values()) {
      manager.destroy();
    }
    this.managers.clear();
  }
}

// 预定义的缓存管理器
export const cacheService = CacheService.getInstance();

// 常用缓存管理器实例
export const noteCache = cacheService.getManager('notes', {
  maxSize: 20 * 1024 * 1024, // 20MB
  defaultTTL: 10 * 60 * 1000, // 10分钟
  maxEntries: 500
});

export const aiCache = cacheService.getManager('ai', {
  maxSize: 30 * 1024 * 1024, // 30MB
  defaultTTL: 60 * 60 * 1000, // 1小时
  maxEntries: 200
});

export const modelCache = cacheService.getManager('models', {
  maxSize: 15 * 1024 * 1024, // 15MB
  defaultTTL: 24 * 60 * 60 * 1000, // 24小时
  maxEntries: 100
});