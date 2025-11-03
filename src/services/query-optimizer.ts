import { coreDb } from '../db/core-db';
import { aiDb } from '../db/ai-db';
import { Note as NoteType } from '../types';

/**
 * 查询优化服务
 * 提供数据库查询性能优化、索引管理和查询分析功能
 */

// 查询性能指标接口
interface QueryMetrics {
  queryType: string;
  duration: number;
  resultCount: number;
  timestamp: number;
  cacheHit: boolean;
}

// 索引使用统计接口
interface IndexUsageStats {
  indexName: string;
  tableName: string;
  usageCount: number;
  averageBenefit: number;
  lastUsed: number;
}

// 查询优化建议接口
interface OptimizationSuggestion {
  type: 'INDEX' | 'QUERY' | 'CACHE' | 'SCHEMA';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  impact: string;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * 查询优化器
 */
export class QueryOptimizer {
  private static instance: QueryOptimizer;
  private queryMetrics: QueryMetrics[] = [];
  private indexStats = new Map<string, IndexUsageStats>();
  private maxMetricsHistory = 1000;

  private constructor() {
    this.setupPerformanceMonitoring();
  }

  public static getInstance(): QueryOptimizer {
    if (!QueryOptimizer.instance) {
      QueryOptimizer.instance = new QueryOptimizer();
    }
    return QueryOptimizer.instance;
  }

  /**
   * 设置性能监控
   */
  private setupPerformanceMonitoring(): void {
    // 为数据库操作添加性能监控钩子
    this.monitorCoreDB();
    this.monitorAIDB();
  }

  /**
   * 监控核心数据库性能
   */
  private monitorCoreDB(): void {
    const self = this;
    
    // 监控便签查询
    const originalNotesWhere = coreDb.notes.where.bind(coreDb.notes);
    (coreDb.notes as any).where = function(...args: [any]) {
      const startTime = performance.now();
      const result = originalNotesWhere.apply(coreDb.notes, args);

      // 记录查询指标
      self.recordQueryMetrics('notes.where', startTime, 0, false);

      return result;
    };

    // 监控便签排序
    const originalNotesOrderBy = coreDb.notes.orderBy.bind(coreDb.notes);
    (coreDb.notes as any).orderBy = function(...args: [string | string[]]) {
      const startTime = performance.now();
      const result = originalNotesOrderBy.apply(coreDb.notes, args);

      self.recordQueryMetrics('notes.orderBy', startTime, 0, false);

      return result;
    };
  }

  /**
   * 监控AI数据库性能
   */
  private monitorAIDB(): void {
    const self = this;
    
    // 监控AI建议查询
    const originalSuggestionsWhere = aiDb.aiSuggestions.where.bind(aiDb.aiSuggestions);
    (aiDb.aiSuggestions as any).where = function(...args: [any]) {
      const startTime = performance.now();
      const result = originalSuggestionsWhere.apply(aiDb.aiSuggestions, args);

      self.recordQueryMetrics('aiSuggestions.where', startTime, 0, false);

      return result;
    };
  }

  /**
   * 记录查询指标
   */
  private recordQueryMetrics(
    queryType: string,
    startTime: number,
    resultCount: number,
    cacheHit: boolean
  ): void {
    const duration = performance.now() - startTime;

    const metric: QueryMetrics = {
      queryType,
      duration,
      resultCount,
      timestamp: Date.now(),
      cacheHit
    };

    this.queryMetrics.push(metric);

    // 限制历史记录数量
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory);
    }

    // 记录慢查询警告
    if (duration > 100) {
      console.warn(`🐌 慢查询检测: ${queryType} 耗时 ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * 分析查询性能
   */
  analyzeQueryPerformance(): {
    summary: {
      totalQueries: number;
      averageDuration: number;
      slowQueries: number;
      cacheHitRate: number;
    };
    queryTypes: Record<string, {
      count: number;
      avgDuration: number;
      maxDuration: number;
      cacheHits: number;
    }>;
    slowQueries: QueryMetrics[];
  } {
    const recentMetrics = this.queryMetrics.slice(-100); // 分析最近100个查询

    const summary = {
      totalQueries: recentMetrics.length,
      averageDuration: recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
        : 0,
      slowQueries: recentMetrics.filter(m => m.duration > 100).length,
      cacheHitRate: recentMetrics.length > 0
        ? recentMetrics.filter(m => m.cacheHit).length / recentMetrics.length
        : 0
    };

    // 按查询类型分组
    const queryTypes: Record<string, any> = {};
    for (const metric of recentMetrics) {
      if (!queryTypes[metric.queryType]) {
        queryTypes[metric.queryType] = {
          count: 0,
          avgDuration: 0,
          maxDuration: 0,
          cacheHits: 0
        };
      }

      const type = queryTypes[metric.queryType];
      type.count++;
      type.avgDuration = (type.avgDuration * (type.count - 1) + metric.duration) / type.count;
      type.maxDuration = Math.max(type.maxDuration, metric.duration);
      if (metric.cacheHit) type.cacheHits++;
    }

    const slowQueries = recentMetrics
      .filter(m => m.duration > 100)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    return {
      summary,
      queryTypes,
      slowQueries
    };
  }

  /**
   * 生成优化建议
   */
  generateOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const analysis = this.analyzeQueryPerformance();

    // 慢查询优化建议
    if (analysis.summary.slowQueries > 0) {
      suggestions.push({
        type: 'QUERY',
        priority: 'HIGH',
        description: `检测到 ${analysis.summary.slowQueries} 个慢查询（>100ms）`,
        impact: '显著提升应用响应速度',
        effort: 'MEDIUM'
      });
    }

    // 缓存命中率优化建议
    if (analysis.summary.cacheHitRate < 0.5 && analysis.summary.totalQueries > 50) {
      suggestions.push({
        type: 'CACHE',
        priority: 'MEDIUM',
        description: `缓存命中率较低 (${(analysis.summary.cacheHitRate * 100).toFixed(1)}%)`,
        impact: '减少数据库负载，提升查询速度',
        effort: 'LOW'
      });
    }

    // 便签查询优化建议
    if (analysis.queryTypes['notes.where']?.avgDuration > 50) {
      suggestions.push({
        type: 'INDEX',
        priority: 'HIGH',
        description: '便签查询性能较差，建议优化索引策略',
        impact: '大幅提升便签列表加载速度',
        effort: 'MEDIUM'
      });
    }

    // AI建议查询优化建议
    if (analysis.queryTypes['aiSuggestions.where']?.avgDuration > 30) {
      suggestions.push({
        type: 'INDEX',
        priority: 'MEDIUM',
        description: 'AI建议查询可以进一步优化',
        impact: '提升AI功能响应速度',
        effort: 'LOW'
      });
    }

    return suggestions;
  }

  /**
   * 优化的便签搜索查询
   */
  async optimizedSearchNotes(
    query: string,
    options?: {
      limit?: number;
      includeContent?: boolean;
      dateRange?: { start: Date; end: Date };
      tags?: string[];
      status?: NoteType['status'];
    }
  ): Promise<NoteType[]> {
    const startTime = performance.now();

    try {
      const {
        limit = 50,
        includeContent = true,
        dateRange,
        tags,
        status
      } = options || {};

      let notesQuery = coreDb.notes.toCollection();

      // 应用过滤条件（优化：先应用最选择性的条件）
      if (dateRange) {
        notesQuery = notesQuery.filter(note =>
          note.createdAt >= dateRange!.start && note.createdAt <= dateRange!.end
        );
      }

      if (status) {
        notesQuery = notesQuery.filter(note => note.status === status);
      }

      if (tags && tags.length > 0) {
        notesQuery = notesQuery.filter(note =>
          tags!.some(tag => note.tags.includes(tag))
        );
      }

      // 获取候选数据
      let candidates = await notesQuery.limit(limit * 2).toArray(); // 获取更多候选数据

      // 内存中进行文本搜索（更快）
      if (query) {
        const searchLower = query.toLowerCase();
        candidates = candidates.filter(note => {
          const titleMatch = note.title?.toLowerCase().includes(searchLower) || false;
          const contentMatch = includeContent &&
            note.content.toLowerCase().includes(searchLower);
          return titleMatch || contentMatch;
        });
      }

      // 按更新时间排序并限制数量
      const results = candidates
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, limit);

      const duration = performance.now() - startTime;
      this.recordQueryMetrics('optimizedSearch', startTime, results.length, false);

      console.log(`🔍 优化搜索完成: ${results.length} 个结果，耗时 ${duration.toFixed(2)}ms`);
      return results;

    } catch (error) {
      console.error('❌ 优化搜索失败:', error);
      throw error;
    }
  }

  /**
   * 优化的分页查询
   */
  async optimizedPaginatedQuery<T>(
    collection: any,
    options: {
      page: number;
      pageSize: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      filters?: Array<(item: T) => boolean>;
    }
  ): Promise<{
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const startTime = performance.now();

    try {
      const { page, pageSize, sortBy, sortOrder = 'desc', filters = [] } = options;

      // 应用排序
      let query = sortBy
        ? collection.orderBy(sortBy)[sortOrder === 'asc' ? 'asc' : 'desc']()
        : collection.orderBy('updatedAt').reverse();

      // 应用过滤器
      for (const filter of filters) {
        query = query.filter(filter);
      }

      // 获取总数（分页前）
      const total = await query.count();

      // 计算分页偏移
      const offset = (page - 1) * pageSize;
      const totalPages = Math.ceil(total / pageSize);

      // 获取分页数据
      const items = await query.offset(offset).limit(pageSize).toArray();

      const duration = performance.now() - startTime;
      this.recordQueryMetrics('optimizedPaginate', startTime, items.length, false);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages
      };
    } catch (error) {
      console.error('❌ 优化分页查询失败:', error);
      throw error;
    }
  }

  /**
   * 批量操作优化
   */
  async optimizedBulkOperation<T>(
    operation: (items: T[]) => Promise<void>,
    items: T[],
    batchSize: number = 100
  ): Promise<void> {
    const startTime = performance.now();

    try {
      console.log(`🔄 开始批量操作: ${items.length} 个项目，批次大小 ${batchSize}`);

      // 分批处理，避免长时间阻塞
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await operation(batch);

        // 让出控制权，避免阻塞UI
        if (i + batchSize < items.length) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      const duration = performance.now() - startTime;
      console.log(`✅ 批量操作完成: 耗时 ${duration.toFixed(2)}ms`);

    } catch (error) {
      console.error('❌ 批量操作失败:', error);
      throw error;
    }
  }

  /**
   * 数据库健康检查
   */
  async performHealthCheck(): Promise<{
    overall: 'HEALTHY' | 'WARNING' | 'ERROR';
    coreDB: {
      status: string;
      recordCounts: Record<string, number>;
      issues: string[];
    };
    aiDB: {
      status: string;
      recordCounts: Record<string, number>;
      issues: string[];
    };
    performance: {
      averageQueryTime: number;
      slowQueries: number;
      cacheHitRate: number;
    };
  }> {
    const analysis = this.analyzeQueryPerformance();

    // 检查核心数据库
    const coreDBHealth = await this.checkCoreDBHealth();

    // 检查AI数据库
    const aiDBHealth = await this.checkAIDBHealth();

    // 整体健康状态
    let overall: 'HEALTHY' | 'WARNING' | 'ERROR' = 'HEALTHY';
    if (coreDBHealth.issues.length > 0 || aiDBHealth.issues.length > 0) {
      overall = 'WARNING';
    }
    if (analysis.summary.slowQueries > analysis.summary.totalQueries * 0.1) {
      overall = 'ERROR';
    }

    return {
      overall,
      coreDB: coreDBHealth,
      aiDB: aiDBHealth,
      performance: {
        averageQueryTime: analysis.summary.averageDuration,
        slowQueries: analysis.summary.slowQueries,
        cacheHitRate: analysis.summary.cacheHitRate
      }
    };
  }

  /**
   * 检查核心数据库健康状态
   */
  private async checkCoreDBHealth(): Promise<{
    status: string;
    recordCounts: Record<string, number>;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const [
        notesCount,
        tagsCount,
        settingsCount
      ] = await Promise.all([
        coreDb.notes.count(),
        coreDb.tags.count(),
        coreDb.settings.count()
      ]);

      const recordCounts = {
        notes: notesCount,
        tags: tagsCount,
        settings: settingsCount,
        activities: await coreDb.activities.count(),
        shortcuts: await coreDb.customShortcuts.count()
      };

      // 检查数据完整性
      if (notesCount > 0 && settingsCount === 0) {
        issues.push('存在便签数据但缺少设置信息');
      }

      if (notesCount > 0 && tagsCount === 0) {
        issues.push('存在便签数据但无标签系统');
      }

      return {
        status: issues.length === 0 ? 'HEALTHY' : 'WARNING',
        recordCounts,
        issues
      };
    } catch (error) {
      return {
        status: 'ERROR',
        recordCounts: {},
        issues: [`数据库访问失败: ${(error as Error).message || '未知错误'}`]
      };
    }
  }

  /**
   * 检查AI数据库健康状态
   */
  private async checkAIDBHealth(): Promise<{
    status: string;
    recordCounts: Record<string, number>;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const [
        providersCount,
        suggestionsCount,
        usageCount,
        cacheCount
      ] = await Promise.all([
        aiDb.aiProviders.count(),
        aiDb.aiSuggestions.count(),
        aiDb.aiModelUsage.count(),
        aiDb.aiModelCache.count()
      ]);

      const recordCounts = {
        providers: providersCount,
        suggestions: suggestionsCount,
        usage: usageCount,
        cache: cacheCount
      };

      // 检查数据完整性
      if (suggestionsCount > 5000) {
        issues.push('AI建议数据过多，建议清理');
      }

      if (cacheCount > 1000) {
        issues.push('模型缓存数据过多，建议清理');
      }

      return {
        status: issues.length === 0 ? 'HEALTHY' : 'WARNING',
        recordCounts,
        issues
      };
    } catch (error) {
      return {
        status: 'ERROR',
        recordCounts: {},
        issues: [`AI数据库访问失败: ${(error as Error).message || '未知错误'}`]
      };
    }
  }

  /**
   * 清理性能数据
   */
  clearMetrics(): void {
    this.queryMetrics = [];
    this.indexStats.clear();
    console.log('🧹 性能数据已清理');
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): string {
    const analysis = this.analyzeQueryPerformance();
    const suggestions = this.generateOptimizationSuggestions();

    let report = '📊 数据库性能报告\n';
    report += '==================\n\n';

    report += '📈 查询统计:\n';
    report += `  总查询数: ${analysis.summary.totalQueries}\n`;
    report += `  平均耗时: ${analysis.summary.averageDuration.toFixed(2)}ms\n`;
    report += `  慢查询数: ${analysis.summary.slowQueries}\n`;
    report += `  缓存命中率: ${(analysis.summary.cacheHitRate * 100).toFixed(1)}%\n\n`;

    report += '🐌 慢查询详情:\n';
    for (const query of analysis.slowQueries.slice(0, 5)) {
      report += `  ${query.queryType}: ${query.duration.toFixed(2)}ms\n`;
    }

    if (suggestions.length > 0) {
      report += '\n💡 优化建议:\n';
      for (const suggestion of suggestions) {
        report += `  [${suggestion.priority}] ${suggestion.description}\n`;
      }
    }

    return report;
  }
}

// 导出单例实例
export const queryOptimizer = QueryOptimizer.getInstance();