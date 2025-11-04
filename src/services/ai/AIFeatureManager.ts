/**
 * AI 功能管理器
 * 统一管理 AI 功能的加载、状态和可用性
 */

export interface AIFeatureStatus {
  enabled: boolean;
  available: boolean;
  initialized: boolean;
  error?: string;
  lastChecked: Date;
}

export interface AIConfiguration {
  globallyEnabled: boolean;
  autoInitialize: boolean;
  fallbackEnabled: boolean;
  providers: string[];
}

class AIFeatureManager {
  private static instance: AIFeatureManager;
  private status: AIFeatureStatus;
  private config: AIConfiguration;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    this.status = {
      enabled: this.isGloballyEnabled(),
      available: false,
      initialized: false,
      lastChecked: new Date()
    };

    this.config = {
      globallyEnabled: this.isGloballyEnabled(),
      autoInitialize: true,
      fallbackEnabled: true,
      providers: []
    };
  }

  static getInstance(): AIFeatureManager {
    if (!AIFeatureManager.instance) {
      AIFeatureManager.instance = new AIFeatureManager();
    }
    return AIFeatureManager.instance;
  }

  /**
   * 检查 AI 功能是否全局启用
   */
  private isGloballyEnabled(): boolean {
    // 检查环境变量
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const envEnabled = import.meta.env.VITE_AI_ENABLED;
      if (envEnabled === 'false') {
        return false;
      }
    }
    return true;
  }

  /**
   * 检查 AI 功能是否可用
   */
  isAvailable(): boolean {
    return this.status.enabled && this.status.available && this.status.initialized;
  }

  /**
   * 获取 AI 功能状态
   */
  getStatus(): AIFeatureStatus {
    return { ...this.status };
  }

  /**
   * 获取 AI 配置
   */
  getConfig(): AIConfiguration {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<AIConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    this.status.enabled = this.config.globallyEnabled;

    console.log('AI 功能配置已更新:', this.config);
  }

  /**
   * 异步初始化 AI 功能（如果启用）
   */
  async initializeIfEnabled(): Promise<void> {
    // 如果已经在初始化中，返回现有的 Promise
    if (this.initPromise) {
      return this.initPromise;
    }

    // 如果未启用，直接返回
    if (!this.status.enabled) {
      console.log('AI 功能已禁用，跳过初始化');
      return;
    }

    // 如果已经初始化，直接返回
    if (this.status.initialized) {
      console.log('AI 功能已初始化');
      return;
    }

    // 开始初始化
    this.initPromise = this.performInitialization();
    return this.initPromise;
  }

  /**
   * 执行实际的初始化
   */
  private async performInitialization(): Promise<void> {
    try {
      console.log('🚀 开始初始化 AI 功能...');

      // 动态导入 AI 设置服务
      const { aiSettingsService } = await import('./AISettingsService');
      console.log('✅ AI 设置服务模块加载成功');

      // 初始化 AI 设置服务
      await aiSettingsService.initialize();
      console.log('✅ AI 设置服务初始化成功');

      // 创建 AI 服务实例（整合模型管理器和设置服务）
      const aiService = {
        settings: aiSettingsService,
        isAvailable: () => true,
        getStatus: () => this.getStatus()
      };

      // 设置全局 AI 服务（安全方式）
      if (typeof window !== 'undefined') {
        (window as any).aiService = aiService;
        console.log('✅ 全局 AI 服务已设置');
      }

      // 更新状态
      this.status.available = true;
      this.status.initialized = true;
      this.status.lastChecked = new Date();
      this.status.error = undefined;

      console.log('🎉 AI 功能初始化完成');

    } catch (error) {
      console.error('❌ AI 功能初始化失败:', error);

      this.status.available = false;
      this.status.initialized = false;
      this.status.error = error instanceof Error ? error.message : '未知错误';
      this.status.lastChecked = new Date();

      // 如果启用了降级，显示友好提示
      if (this.config.fallbackEnabled) {
        console.warn('💡 AI 功能不可用，应用将在本地模式下运行');
      }

      throw error;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * 强制重新初始化
   */
  async reinitialize(): Promise<void> {
    this.status.initialized = false;
    this.status.available = false;
    this.initPromise = null;

    await this.initializeIfEnabled();
  }

  /**
   * 禁用 AI 功能
   */
  disable(): void {
    this.updateConfig({ globallyEnabled: false });

    // 清理全局 AI 服务
    if (typeof window !== 'undefined') {
      delete (window as any).aiService;
    }

    console.log('AI 功能已禁用');
  }

  /**
   * 启用 AI 功能
   */
  async enable(): Promise<void> {
    this.updateConfig({ globallyEnabled: true });
    await this.initializeIfEnabled();
  }

  /**
   * 获取安全的 AI 服务访问
   */
  getAIService() {
    if (this.isAvailable() && typeof window !== 'undefined') {
      return (window as any).aiService;
    }
    return null;
  }

  /**
   * 执行 AI 相关操作的安全包装器
   */
  async safeExecute<T>(
    operation: (aiService: any) => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<T | null> {
    const aiService = this.getAIService();

    if (!aiService) {
      if (fallback) {
        console.warn('AI 服务不可用，使用降级方案');
        return await fallback();
      }
      console.warn('AI 服务不可用，操作被跳过');
      return null;
    }

    try {
      return await operation(aiService);
    } catch (error) {
      console.error('AI 操作失败:', error);

      if (fallback) {
        console.warn('AI 操作失败，使用降级方案');
        return await fallback();
      }

      return null;
    }
  }

  /**
   * 检查特定 AI 功能是否可用
   */
  isFeatureEnabled(feature: 'search' | 'relation' | 'reminder' | 'settings'): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    // 检查特定功能的开关
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const featureFlags = {
        search: import.meta.env.VITE_AI_SEARCH_ENABLED !== 'false',
        relation: import.meta.env.VITE_AI_RELATION_ENABLED !== 'false',
        reminder: import.meta.env.VITE_AI_REMINDER_ENABLED !== 'false',
        settings: true // 设置总是可用
      };

      return featureFlags[feature] ?? true;
    }

    return true;
  }
}

// 导出单例实例
export const aiFeatureManager = AIFeatureManager.getInstance();

// 便捷函数
export const isAIAvailable = () => aiFeatureManager.isAvailable();
export const getAIStatus = () => aiFeatureManager.getStatus();
export const initializeAI = () => aiFeatureManager.initializeIfEnabled();
export const safeGetAIService = () => aiFeatureManager.getAIService();
export const safeExecuteAI = <T>(
  operation: (aiService: any) => Promise<T>,
  fallback?: () => T | Promise<T>
) => aiFeatureManager.safeExecute(operation, fallback);