import { Note as NoteType } from '../types';
import { noteRepository } from '../repositories/note-repository';
import { aiRepository } from '../repositories/ai-repository';
import { backupService } from './backup-service';
import { noteCache, aiCache } from './cache-service';

/**
 * 事件类型定义
 */
export type EventType =
  // 便签相关事件
  | 'note:created'
  | 'note:updated'
  | 'note:deleted'
  | 'note:viewed'
  | 'note:searched'

  // AI相关事件
  | 'ai:suggestion:requested'
  | 'ai:suggestion:received'
  | 'ai:provider:configured'
  | 'ai:model:used'

  // 系统相关事件
  | 'system:backup:created'
  | 'system:backup:restored'
  | 'system:cache:cleared'
  | 'system:settings:changed'

  // 用户行为事件
  | 'user:login'
  | 'user:logout'
  | 'user:settings:updated'
  | 'user:theme:changed';

/**
 * 事件数据接口
 */
export interface EventData {
  type: EventType;
  payload: any;
  timestamp: number;
  source: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

/**
 * 事件处理器接口
 */
export type EventHandler<T = any> = (data: EventData & { payload: T }) => void | Promise<void>;

/**
 * 事件订阅配置
 */
export interface SubscriptionConfig {
  once?: boolean; // 是否只触发一次
  priority?: number; // 优先级（数字越大优先级越高）
  condition?: (data: EventData) => boolean; // 条件触发
  debounce?: number; // 防抖延迟（毫秒）
}

/**
 * 事件总线 - 实现发布订阅模式
 */
export class EventBus {
  private static instance: EventBus;
  private handlers = new Map<EventType, Array<{ handler: EventHandler; config: SubscriptionConfig }>>();
  private middleware: Array<(event: EventData, next: () => void) => void> = [];
  private eventHistory: EventData[] = [];
  private maxHistorySize = 1000;

  private constructor() {
    this.setupCoreHandlers();
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * 订阅事件
   */
  subscribe<T>(
    eventType: EventType,
    handler: EventHandler<T>,
    config: SubscriptionConfig = {}
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    const subscription = { handler, config };
    this.handlers.get(eventType)!.push(subscription);

    // 返回取消订阅函数
    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(subscription);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * 发布事件
   */
  async publish(eventType: EventType, payload: any, options?: {
    source?: string;
    correlationId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const eventData: EventData = {
      type: eventType,
      payload,
      timestamp: Date.now(),
      source: options?.source || 'unknown',
      correlationId: options?.correlationId,
      metadata: options?.metadata
    };

    // 记录事件历史
    this.recordEvent(eventData);

    // 应用中间件
    await this.applyMiddleware(eventData, () => {
      // 分发给处理器
      this.distributeEvent(eventData);
    });
  }

  /**
   * 记录事件历史
   */
  private recordEvent(event: EventData): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * 应用中间件
   */
  private async applyMiddleware(event: EventData, final: () => void): Promise<void> {
    let index = 0;

    const next = async () => {
      if (index >= this.middleware.length) {
        final();
        return;
      }

      const middleware = this.middleware[index++];
      await middleware(event, next);
    };

    await next();
  }

  /**
   * 分发事件给处理器
   */
  private async distributeEvent(event: EventData): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers || handlers.length === 0) {
      return;
    }

    // 按优先级排序
    const sortedHandlers = [...handlers].sort((a, b) => (b.config.priority || 0) - (a.config.priority || 0));

    for (const { handler, config } of sortedHandlers) {
      try {
        // 条件检查
        if (config.condition && !config.condition(event)) {
          continue;
        }

        // 防抖处理
        if (config.debounce) {
          await this.debounceHandler(handler, event, config.debounce);
        } else {
          await handler(event);
        }

        // 如果是一次性处理器，移除它
        if (config.once) {
          this.unsubscribe(event.type, handler);
        }
      } catch (error) {
        console.error(`事件处理器错误 (${event.type}):`, error);
      }
    }
  }

  /**
   * 防抖处理
   */
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  private async debounceHandler(handler: EventHandler, event: EventData, delay: number): Promise<void> {
    const key = `${event.type}_${event.correlationId || 'default'}`;

    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key)!);
    }

    this.debounceTimers.set(key, setTimeout(async () => {
      await handler(event);
      this.debounceTimers.delete(key);
    }, delay));
  }

  /**
   * 取消订阅
   */
  private unsubscribe(eventType: EventType, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.findIndex(h => h.handler === handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 添加中间件
   */
  use(middleware: (event: EventData, next: () => void) => void): void {
    this.middleware.push(middleware);
  }

  /**
   * 获取事件历史
   */
  getEventHistory(eventType?: EventType, limit?: number): EventData[] {
    let history = this.eventHistory;

    if (eventType) {
      history = history.filter(event => event.type === eventType);
    }

    if (limit) {
      history = history.slice(-limit);
    }

    return history;
  }

  /**
   * 清空事件历史
   */
  clearEventHistory(): void {
    this.eventHistory = [];
  }

  /**
   * 获取处理器统计
   */
  getHandlerStats(): Record<EventType, number> {
    const stats: Record<EventType, number> = {} as any;
    for (const [eventType, handlers] of this.handlers.entries()) {
      stats[eventType] = handlers.length;
    }
    return stats;
  }

  /**
   * 设置核心事件处理器
   */
  private setupCoreHandlers(): void {
    // 便签创建事件 - 触发AI建议生成
    this.subscribe('note:created', async (event) => {
      const note = event.payload as NoteType;
      console.log('📝 便签创建事件:', note.id);

      // 异步生成AI建议
      setTimeout(async () => {
        try {
          await this.generateAISuggestions(note);
        } catch (error) {
          console.error('AI建议生成失败:', error);
        }
      }, 1000);
    }, { priority: 10 });

    // 便签更新事件 - 清理相关缓存
    this.subscribe('note:updated', async (event) => {
      const note = event.payload as NoteType;
      console.log('✏️ 便签更新事件:', note.id);

      // 清理相关缓存
      noteCache.delete(`note_${note.id}`);
      aiCache.deleteByTag(`note_${note.id}`);
    }, { priority: 10 });

    // 便签删除事件 - 清理所有相关数据
    this.subscribe('note:deleted', async (event) => {
      const { noteId, tags } = event.payload as { noteId: string; tags: string[] };
      console.log('🗑️ 便签删除事件:', noteId);

      // 清理缓存
      noteCache.delete(`note_${noteId}`);
      aiCache.deleteByTag(`note_${noteId}`);

      // 清理AI建议
      const suggestions = await aiRepository.getSuggestions(noteId);
      for (const suggestion of suggestions) {
        if (suggestion.id) {
          await aiRepository.deleteSuggestion(suggestion.id);
        }
      }
    }, { priority: 10 });

    // AI建议请求事件 - 缓存管理
    this.subscribe('ai:suggestion:requested', async (event) => {
      const { noteId, type } = event.payload as { noteId: string; type: string };
      console.log('🤖 AI建议请求事件:', noteId, type);

      // 检查缓存
      const cacheKey = `ai_suggestion_${noteId}_${type}`;
      const cached = await aiCache.get(cacheKey);

      if (cached) {
        await eventBus.publish('ai:suggestion:received', {
          noteId,
          type,
          suggestions: cached,
          fromCache: true
        }, { correlationId: event.correlationId });
      }
    }, { priority: 5 });

    // 系统设置变更事件 - 清理配置相关缓存
    this.subscribe('system:settings:changed', async (event) => {
      console.log('⚙️ 系统设置变更事件');

      // 清理设置相关缓存
      noteCache.deleteByTag('settings');
      aiCache.deleteByTag('settings');
    }, { priority: 8 });

    // 用户主题变更事件 - 立即应用
    this.subscribe('user:theme:changed', (event) => {
      const theme = event.payload as string;
      console.log('🎨 主题变更事件:', theme);

      // 应用主题变更
      document.body.className = document.body.className.replace(/theme-\w+/g, '');
      document.body.classList.add(`theme-${theme}`);
    }, { priority: 20 });
  }

  /**
   * 生成AI建议
   */
  private async generateAISuggestions(note: NoteType): Promise<void> {
    try {
      console.log('🤖 为便签生成AI建议:', note.id);

      // 获取相关的便签
      const relatedNotes = await noteRepository.searchNotes(note.title || '', {
        searchInTitle: true,
        searchInContent: false,
        limit: 5
      });

      // 保存搜索建议
      if (relatedNotes.length > 0) {
        await aiRepository.saveSuggestion({
          noteId: note.id,
          relatedNotes: JSON.stringify(relatedNotes.map(n => n.id)),
          searchKeywords: JSON.stringify(this.extractKeywords(note.content)),
          lastAnalyzed: new Date(),
          confidence: 0.8,
          suggestionType: 'search'
        });

        // 发布AI建议接收事件
        await eventBus.publish('ai:suggestion:received', {
          noteId: note.id,
          type: 'search',
          suggestions: relatedNotes,
          fromCache: false
        });
      }

    } catch (error) {
      console.error('AI建议生成失败:', error);
    }
  }

  /**
   * 提取关键词
   */
  private extractKeywords(content: string): string[] {
    // 简单的关键词提取逻辑
    const words = content.toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1);

    // 词频统计
    const wordCount = new Map<string, number>();
    for (const word of words) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }

    // 返回高频词汇
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
}

/**
 * 应用事件服务 - 提供高级事件功能
 */
export class AppEventService {
  private static instance: AppEventService;
  private eventBus: EventBus;

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.setupLoggingMiddleware();
  }

  public static getInstance(): AppEventService {
    if (!AppEventService.instance) {
      AppEventService.instance = new AppEventService();
    }
    return AppEventService.instance;
  }

  /**
   * 设置日志中间件
   */
  private setupLoggingMiddleware(): void {
    this.eventBus.use((event, next) => {
      console.log(`📤 事件: ${event.type} 来自 ${event.source}`);
      next();
    });
  }

  /**
   * 便签事件包装器
   */
  async noteCreated(note: NoteType): Promise<void> {
    await this.eventBus.publish('note:created', note, {
      source: 'NoteRepository',
      metadata: { tags: note.tags.length }
    });
  }

  async noteUpdated(note: NoteType, changes: Partial<NoteType>): Promise<void> {
    await this.eventBus.publish('note:updated', { note, changes }, {
      source: 'NoteRepository'
    });
  }

  async noteDeleted(noteId: string, tags: string[]): Promise<void> {
    await this.eventBus.publish('note:deleted', { noteId, tags }, {
      source: 'NoteRepository'
    });
  }

  async noteViewed(noteId: string): Promise<void> {
    await this.eventBus.publish('note:viewed', { noteId }, {
      source: 'NoteView'
    });
  }

  /**
   * AI事件包装器
   */
  async requestAISuggestion(noteId: string, type: string): Promise<void> {
    await this.eventBus.publish('ai:suggestion:requested', { noteId, type }, {
      source: 'AIService'
    });
  }

  async aiProviderConfigured(providerId: number, providerType: string): Promise<void> {
    await this.eventBus.publish('ai:provider:configured', { providerId, providerType }, {
      source: 'AIRepository'
    });
  }

  /**
   * 系统事件包装器
   */
  async backupCreated(backupInfo: any): Promise<void> {
    await this.eventBus.publish('system:backup:created', backupInfo, {
      source: 'BackupService'
    });
  }

  async settingsChanged(settings: any): Promise<void> {
    await this.eventBus.publish('system:settings:changed', settings, {
      source: 'SettingsService'
    });
  }

  /**
   * 用户事件包装器
   */
  async userThemeChanged(theme: string): Promise<void> {
    await this.eventBus.publish('user:theme:changed', theme, {
      source: 'ThemeService'
    });
  }

  /**
   * 订阅便捷方法
   */
  onNoteCreated(handler: EventHandler<NoteType>): () => void {
    return this.eventBus.subscribe('note:created', handler);
  }

  onNoteUpdated(handler: EventHandler<{ note: NoteType; changes: Partial<NoteType> }>): () => void {
    return this.eventBus.subscribe('note:updated', handler);
  }

  onNoteDeleted(handler: EventHandler<{ noteId: string; tags: string[] }>): () => void {
    return this.eventBus.subscribe('note:deleted', handler);
  }

  onAISuggestionReceived(handler: EventHandler<any>): () => void {
    return this.eventBus.subscribe('ai:suggestion:received', handler);
  }

  onThemeChanged(handler: EventHandler<string>): () => void {
    return this.eventBus.subscribe('user:theme:changed', handler);
  }

  /**
   * 获取事件总线实例（用于高级用法）
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * 获取事件统计
   */
  getEventStats(): {
    handlerCount: Record<EventType, number>;
    recentEvents: EventData[];
    totalEvents: number;
  } {
    return {
      handlerCount: this.eventBus.getHandlerStats(),
      recentEvents: this.eventBus.getEventHistory(undefined, 50),
      totalEvents: this.eventBus.getEventHistory().length
    };
  }
}

// 导出实例
export const eventBus = EventBus.getInstance();
export const appEventService = AppEventService.getInstance();