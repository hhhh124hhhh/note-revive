/**
 * 环境配置管理服务
 * 处理环境变量读取、验证和默认值管理
 */

export interface AIProviderConfig {
  name: string;
  type: 'deepseek' | 'zhipu' | 'kimi' | 'openai' | 'claude';
  apiKey?: string;
  baseUrl: string;
  defaultModel: string;
  enabled: boolean;
}

export interface GlobalAIConfig {
  enabled: boolean;
  defaultProvider: string;
  defaultModel: string;
  searchEnabled: boolean;
  relationEnabled: boolean;
  reminderEnabled: boolean;
  debugMode: boolean;
  timeout: number;
  cacheExpiry: number;
  costLimit: number;
}

export interface EnvironmentConfig {
  global: GlobalAIConfig;
  providers: AIProviderConfig[];
}

class EnvConfigService {
  private static instance: EnvConfigService;
  private config: EnvironmentConfig | null = null;

  private constructor() {}

  static getInstance(): EnvConfigService {
    if (!EnvConfigService.instance) {
      EnvConfigService.instance = new EnvConfigService();
    }
    return EnvConfigService.instance;
  }

  /**
   * 获取完整的环境配置
   */
  getConfig(): EnvironmentConfig {
    if (this.config === null) {
      this.config = this.loadConfig();
    }
    return this.config;
  }

  /**
   * 获取全局AI配置
   */
  getGlobalConfig(): GlobalAIConfig {
    return this.getConfig().global;
  }

  /**
   * 获取所有提供商配置
   */
  getProviderConfigs(): AIProviderConfig[] {
    return this.getConfig().providers;
  }

  /**
   * 根据类型获取提供商配置
   */
  getProviderConfig(type: string): AIProviderConfig | undefined {
    return this.getProviderConfigs().find(p => p.type === type);
  }

  /**
   * 检查提供商是否已配置
   */
  isProviderConfigured(type: string): boolean {
    const config = this.getProviderConfig(type);
    return !!(config && config.apiKey && config.apiKey !== '' && !config.apiKey.includes('here'));
  }

  /**
   * 获取已配置的提供商列表
   */
  getConfiguredProviders(): AIProviderConfig[] {
    return this.getProviderConfigs().filter(p => this.isProviderConfigured(p.type));
  }

  /**
   * 验证API密钥格式
   */
  validateApiKey(provider: string, apiKey: string): boolean {
    if (!apiKey || apiKey.trim() === '') return false;
    if (apiKey.includes('here')) return false; // 示例密钥

    switch (provider) {
      case 'deepseek':
        return apiKey.startsWith('sk-') && apiKey.length > 20;
      case 'zhipu':
        return apiKey.length > 10; // 智谱API密钥格式不固定
      case 'kimi':
        return apiKey.startsWith('sk-') && apiKey.length > 20;
      case 'openai':
        return apiKey.startsWith('sk-') && apiKey.length > 20;
      case 'claude':
        return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
      default:
        return apiKey.length > 5;
    }
  }

  /**
   * 重新加载配置
   */
  reloadConfig(): void {
    this.config = null;
  }

  /**
   * 从环境变量加载配置
   */
  private loadConfig(): EnvironmentConfig {
    const globalConfig: GlobalAIConfig = {
      enabled: this.getEnvBoolean('VITE_AI_ENABLED', true),
      defaultProvider: this.getEnvString('VITE_AI_DEFAULT_PROVIDER', 'deepseek'),
      defaultModel: this.getEnvString('VITE_AI_DEFAULT_MODEL', 'deepseek-chat'),
      searchEnabled: this.getEnvBoolean('VITE_AI_SEARCH_ENABLED', true),
      relationEnabled: this.getEnvBoolean('VITE_AI_RELATION_ENABLED', true),
      reminderEnabled: this.getEnvBoolean('VITE_AI_REMINDER_ENABLED', true),
      debugMode: this.getEnvBoolean('VITE_DEBUG_AI', false),
      timeout: this.getEnvNumber('VITE_AI_TIMEOUT', 30000),
      cacheExpiry: this.getEnvNumber('VITE_AI_CACHE_EXPIRY', 24),
      costLimit: this.getEnvNumber('VITE_AI_COST_LIMIT', 10.0)
    };

    const providers: AIProviderConfig[] = [
      {
        name: 'DeepSeek',
        type: 'deepseek',
        apiKey: this.getEnvString('VITE_DEEPSEEK_API_KEY'),
        baseUrl: this.getEnvString('VITE_DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
        defaultModel: this.getEnvString('VITE_DEEPSEEK_MODEL', 'deepseek-chat'),
        enabled: this.isProviderConfigured('deepseek')
      },
      {
        name: '智谱AI',
        type: 'zhipu',
        apiKey: this.getEnvString('VITE_ZHIPU_API_KEY'),
        baseUrl: this.getEnvString('VITE_ZHIPU_BASE_URL', 'https://open.bigmodel.cn/api/paas/v4'),
        defaultModel: this.getEnvString('VITE_ZHIPU_MODEL', 'glm-4'),
        enabled: this.isProviderConfigured('zhipu')
      },
      {
        name: 'Kimi',
        type: 'kimi',
        apiKey: this.getEnvString('VITE_KIMI_API_KEY'),
        baseUrl: this.getEnvString('VITE_KIMI_BASE_URL', 'https://api.moonshot.cn/v1'),
        defaultModel: this.getEnvString('VITE_KIMI_MODEL', 'moonshot-v1-8k'),
        enabled: this.isProviderConfigured('kimi')
      },
      {
        name: 'OpenAI',
        type: 'openai',
        apiKey: this.getEnvString('VITE_OPENAI_API_KEY'),
        baseUrl: this.getEnvString('VITE_OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        defaultModel: this.getEnvString('VITE_OPENAI_MODEL', 'gpt-4-turbo-preview'),
        enabled: this.isProviderConfigured('openai')
      },
      {
        name: 'Claude',
        type: 'claude',
        apiKey: this.getEnvString('VITE_CLAUDE_API_KEY'),
        baseUrl: this.getEnvString('VITE_CLAUDE_BASE_URL', 'https://api.anthropic.com'),
        defaultModel: this.getEnvString('VITE_CLAUDE_MODEL', 'claude-3-sonnet-20240229'),
        enabled: this.isProviderConfigured('claude')
      }
    ];

    return {
      global: globalConfig,
      providers
    };
  }

  /**
   * 获取环境变量字符串值
   */
  private getEnvString(key: string, defaultValue: string = ''): string {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env[key] || defaultValue;
    }
    return defaultValue;
  }

  /**
   * 获取环境变量布尔值
   */
  private getEnvBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = this.getEnvString(key);
    if (value === '') return defaultValue;
    return value.toLowerCase() === 'true';
  }

  /**
   * 获取环境变量数字值
   */
  private getEnvNumber(key: string, defaultValue: number = 0): number {
    const value = this.getEnvString(key);
    if (value === '') return defaultValue;
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * 获取配置摘要信息
   */
  getConfigSummary(): {
    totalProviders: number;
    configuredProviders: number;
    enabledProviders: number;
    globalEnabled: boolean;
    defaultProvider: string;
  } {
    const config = this.getConfig();
    const configuredProviders = this.getConfiguredProviders();
    const enabledProviders = config.providers.filter(p => p.enabled);

    return {
      totalProviders: config.providers.length,
      configuredProviders: configuredProviders.length,
      enabledProviders: enabledProviders.length,
      globalEnabled: config.global.enabled,
      defaultProvider: config.global.defaultProvider
    };
  }

  /**
   * 检查配置完整性
   */
  validateConfig(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const config = this.getConfig();

    // 检查全局配置
    if (!config.global.enabled) {
      warnings.push('AI功能已禁用');
    }

    if (!config.providers.some(p => p.enabled)) {
      errors.push('没有已配置的AI提供商');
    }

    // 检查默认提供商
    const defaultProvider = config.providers.find(p => p.type === config.global.defaultProvider);
    if (!defaultProvider) {
      errors.push(`默认提供商 '${config.global.defaultProvider}' 不存在`);
    } else if (!defaultProvider.enabled) {
      warnings.push(`默认提供商 '${defaultProvider.name}' 未配置API密钥`);
    }

    // 检查API密钥格式
    for (const provider of config.providers) {
      if (provider.apiKey && !this.validateApiKey(provider.type, provider.apiKey)) {
        warnings.push(`${provider.name} 的API密钥格式可能不正确`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// 导出单例实例
export const envConfigService = EnvConfigService.getInstance();

// 导出便捷函数
export const getEnvConfig = () => envConfigService.getConfig();
export const getGlobalAIConfig = () => envConfigService.getGlobalConfig();
export const getProviderConfigs = () => envConfigService.getProviderConfigs();
export const isProviderConfigured = (type: string) => envConfigService.isProviderConfigured(type);