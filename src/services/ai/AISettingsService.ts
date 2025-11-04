/**
 * AI设置服务
 * 管理AI提供商配置、模型选择和相关设置
 */

import { ModelManager, ProviderCredentials, ModelManagerConfig } from './ModelManager';
import {
  getAIProviders,
  getEnabledAIProviders,
  addAIProvider,
  updateAIProvider,
  deleteAIProvider,
  toggleAIProvider,
  updateProviderTestStatus,
  DbAIProvider,
  initDefaultAIProviders,
  migrateAISettings,
  recordModelUsage
} from '../../db';
import { ModelInfo, CustomProviderConfig } from './types';
import { encryptContent, decryptContent } from '../../db';
import { envConfigService } from '../config/EnvConfigService';

export interface AISettings {
  providers: DbAIProvider[];
  enabledProviders: DbAIProvider[];
  selectedProvider?: DbAIProvider;
  selectedModel?: string;
  globalEnabled: boolean;
}

export interface ProviderTestResult {
  providerId: number;
  success: boolean;
  message: string;
  responseTime: number;
  models?: ModelInfo[];
}

export class AISettingsService {
  private modelManager: ModelManager;
  private initialized = false;

  constructor() {
    this.modelManager = new ModelManager();
  }

  /**
   * 初始化AI设置服务
   */
  async initialize(): Promise<void> {
    // 防止重复初始化
    if (this.initialized) {
      console.log('AI设置服务已经初始化过了，跳过');
      return;
    }

    try {
      console.log('🚀 开始初始化AI设置服务...');

      // 添加延迟以确保数据库完全就绪
      await new Promise(resolve => setTimeout(resolve, 100));

      // 初始化默认提供商
      console.log('📦 初始化默认AI提供商...');
      await initDefaultAIProviders();

      // 验证提供商是否正确创建
      const providers = await getAIProviders();
      console.log(`✅ 已加载 ${providers.length} 个AI提供商:`, providers.map(p => ({
        name: p.name,
        type: p.type,
        enabled: p.enabled,
        hasApiKey: !!p.apiKey
      })));

      // 从环境变量加载初始配置
      console.log('⚙️ 从环境变量加载配置...');
      await this.loadFromEnvironment();

      // 迁移旧版本设置
      console.log('迁移旧版本设置...');
      await migrateAISettings();

      // 初始化模型管理器
      console.log('初始化模型管理器...');
      await this.initializeModelManager();

      console.log('AI设置服务初始化完成');
      this.initialized = true;
    } catch (error) {
      console.error('AI设置服务初始化失败:', error);

      // 如果是数据库相关错误，尝试强制重置
      if (error instanceof Error &&
          (error.message.includes('SchemaError') ||
           error.message.includes('KeyPath') ||
           error.message.includes('indexed') ||
           error.message.includes('aiProviders'))) {

        console.warn('🚨 检测到数据库错误，尝试强制重置...');

        try {
          const { forceResetAllDatabases } = await import('../../utils/forceDatabaseReset');
          await forceResetAllDatabases();
        } catch (resetError) {
          console.error('强制重置失败:', resetError);
        }
      }

      throw error; // 重新抛出错误以便上层处理
    }
  }

  /**
   * 获取所有AI设置
   */
  async getSettings(): Promise<AISettings> {
    const providers = await getAIProviders();
    const enabledProviders = providers.filter(p => p.enabled);
    const selectedProvider = enabledProviders.find(p => p.selectedModel) || enabledProviders[0];

    return {
      providers,
      enabledProviders,
      selectedProvider,
      selectedModel: selectedProvider?.selectedModel,
      globalEnabled: enabledProviders.length > 0
    };
  }

  /**
   * 获取提供商凭据
   */
  async getProviderCredentials(): Promise<ProviderCredentials> {
    const providers = await getAIProviders();
    const credentials: ProviderCredentials = {
      custom: {}
    };

    for (const provider of providers) {
      if (provider.apiKey) {
        try {
          const apiKey = decryptContent(provider.apiKey);

          switch (provider.type) {
            case 'deepseek':
              credentials.deepSeek = apiKey;
              break;
            case 'zhipu':
              credentials.zhipu = apiKey;
              break;
            case 'kimi':
              credentials.kimi = apiKey;
              break;
            case 'custom':
              credentials.custom[provider.name] = apiKey;
              break;
          }
        } catch (error) {
          console.warn(`解密 ${provider.name} API密钥失败:`, error);
        }
      }
    }

    return credentials;
  }

  /**
   * 测试提供商连接
   */
  async testProvider(providerId: number): Promise<ProviderTestResult> {
    const provider = await getAIProviders().then(providers =>
      providers.find(p => p.id === providerId)
    );

    if (!provider) {
      throw new Error(`未找到提供商: ${providerId}`);
    }

    // 更新状态为测试中
    await updateProviderTestStatus(providerId, 'pending', '正在测试连接...');

    try {
      const credentials = await this.getProviderCredentials();
      const apiKey = this.getProviderApiKey(provider, credentials);

      // 检查API密钥是否存在且不是示例密钥
      if (!apiKey) {
        throw new Error('缺少API密钥');
      }
      
      if (this.isExampleApiKey(apiKey)) {
        throw new Error('请使用有效的API密钥，当前使用的是示例密钥');
      }

      const startTime = Date.now();
      const testResult = await this.modelManager.testProviderConnection(provider.type, credentials);
      const responseTime = Date.now() - startTime;

      // 更新测试状态
      await updateProviderTestStatus(
        providerId,
        testResult.success ? 'success' : 'failed',
        testResult.message
      );

      // 获取模型列表
      let models: ModelInfo[] = [];
      if (testResult.success) {
        try {
          models = await this.modelManager.getProviderModels(provider.type, credentials);
        } catch (error) {
          console.warn('获取模型列表失败:', error);
        }
      }

      return {
        providerId,
        success: testResult.success,
        message: testResult.message,
        responseTime,
        models: testResult.success ? models : undefined
      };
    } catch (error) {
      // 处理401错误，提供更友好的错误消息
      let errorMessage = error instanceof Error ? error.message : '测试失败';
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        errorMessage = 'API密钥无效或已过期，请检查您的API密钥配置';
      }

      // 更新测试状态
      await updateProviderTestStatus(providerId, 'failed', errorMessage);

      return {
        providerId,
        success: false,
        message: errorMessage,
        responseTime: 0
      };
    }
  }
  
  // 检测示例API密钥的辅助方法
  private isExampleApiKey(apiKey: string): boolean {
    const exampleKeyPatterns = [
      'sk-example', 'example-key-placeholder', 'demo', 'test'
    ];
    
    const lowerKey = apiKey.toLowerCase();
    return exampleKeyPatterns.some(pattern => lowerKey.includes(pattern));
  }

  /**
   * 批量测试所有启用的提供商
   */
  async testAllEnabledProviders(): Promise<ProviderTestResult[]> {
    const enabledProviders = await getEnabledAIProviders();
    const results: ProviderTestResult[] = [];

    for (const provider of enabledProviders) {
      try {
        const result = await this.testProvider(provider.id!);
        results.push(result);
      } catch (error) {
        results.push({
          providerId: provider.id!,
          success: false,
          message: error instanceof Error ? error.message : '测试失败',
          responseTime: 0
        });
      }
    }

    return results;
  }

  /**
   * 更新提供商配置
   */
  async updateProvider(
    providerId: number,
    updates: {
      name?: string;
      enabled?: boolean;
      apiKey?: string;
      config?: CustomProviderConfig;
      selectedModel?: string;
    }
  ): Promise<void> {
    const updateData: Partial<DbAIProvider> = {};

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    if (updates.enabled !== undefined) {
      updateData.enabled = updates.enabled;
    }

    if (updates.apiKey !== undefined) {
      updateData.apiKey = updates.apiKey ? encryptContent(updates.apiKey) : undefined;
    }

    if (updates.config !== undefined) {
      updateData.config = JSON.stringify(updates.config);
    }

    if (updates.selectedModel !== undefined) {
      updateData.selectedModel = updates.selectedModel;
    }

    await updateAIProvider(providerId, updateData);

    // 如果是自定义提供商且配置发生变化，更新模型管理器
    if (updates.config) {
      await this.updateModelManagerConfig();
    }
  }

  /**
   * 添加自定义提供商
   */
  async addCustomProvider(config: CustomProviderConfig, apiKey?: string): Promise<number> {
    const providerId = await addAIProvider({
      name: config.name,
      type: 'custom',
      enabled: !!apiKey,
      apiKey: apiKey ? encryptContent(apiKey) : undefined,
      config: JSON.stringify(config),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 更新模型管理器配置
    await this.updateModelManagerConfig();

    return providerId;
  }

  /**
   * 删除提供商
   */
  async removeProvider(providerId: number): Promise<void> {
    await deleteAIProvider(providerId);
    await this.updateModelManagerConfig();
  }

  /**
   * 切换提供商启用状态
   */
  async toggleProvider(providerId: number): Promise<void> {
    await toggleAIProvider(providerId);
  }

  /**
   * 获取提供商的可用模型
   */
  async getProviderModels(providerId: number): Promise<ModelInfo[]> {
    const provider = await getAIProviders().then(providers =>
      providers.find(p => p.id === providerId)
    );

    if (!provider) {
      throw new Error(`未找到提供商: ${providerId}`);
    }

    const credentials = await this.getProviderCredentials();
    const apiKey = this.getProviderApiKey(provider, credentials);

    if (!apiKey) {
      throw new Error('缺少API密钥');
    }

    return await this.modelManager.getProviderModels(provider.type, credentials);
  }

  /**
   * 选择模型
   */
  async selectModel(providerId: number, modelId: string): Promise<void> {
    // 清除其他提供商的选中模型
    const allProviders = await getAIProviders();
    for (const provider of allProviders) {
      if (provider.id !== providerId && provider.selectedModel) {
        await updateAIProvider(provider.id!, { selectedModel: undefined });
      }
    }

    // 设置当前提供商的选中模型
    await updateAIProvider(providerId, { selectedModel: modelId });
  }

  /**
   * 获取推荐的模型
   */
  async getRecommendedModels(useCase: 'search' | 'relation' | 'reminder' | 'general'): Promise<ModelInfo[]> {
    return await this.modelManager.getModelsByUseCase(useCase);
  }

  /**
   * 搜索模型
   */
  async searchModels(query: string): Promise<Array<{
    provider: string;
    model: ModelInfo;
    relevanceScore: number;
  }>> {
    const credentials = await this.getProviderCredentials();
    return await this.modelManager.searchModels(query, credentials);
  }

  /**
   * 记录模型使用
   */
  async recordUsage(
    providerId: number,
    modelId: string,
    useCase: 'search' | 'relation' | 'reminder' | 'general',
    tokensUsed: number,
    responseTime: number,
    success: boolean
  ): Promise<void> {
    // 计算成本（简化计算）
    const provider = await getAIProviders().then(providers =>
      providers.find(p => p.id === providerId)
    );

    if (!provider) return;

    let cost = 0;
    try {
      const models = await this.getProviderModels(providerId);
      const model = models.find(m => m.id === modelId);
      if (model) {
        const avgCostPerToken = (model.pricing.input + model.pricing.output) / 2;
        cost = (tokensUsed / 1000) * avgCostPerToken;
      }
    } catch (error) {
      console.warn('计算成本失败:', error);
    }

    await recordModelUsage(
      providerId,
      modelId,
      useCase,
      tokensUsed,
      cost,
      responseTime,
      success
    );
  }

  /**
   * 清除缓存
   */
  async clearCache(providerType?: string): Promise<void> {
    this.modelManager.clearCache(providerType);
  }

  /**
   * 获取使用统计
   */
  async getUsageStats(providerId?: number) {
    const credentials = await this.getProviderCredentials();

    if (providerId) {
      const models = await this.modelManager.getProviderModels(
        (await getAIProviders().then(p => p.find(pr => pr.id === providerId)))?.type || '',
        credentials
      );
      return {
        models,
        stats: await this.modelManager.getCacheStats()
      };
    }

    return {
      allModels: await this.modelManager.getAllModels(credentials),
      stats: await this.modelManager.getCacheStats()
    };
  }

  /**
   * 私有方法：初始化模型管理器
   */
  private async initializeModelManager(): Promise<void> {
    const providers = await getAIProviders();
    const customProviders: CustomProviderConfig[] = [];

    for (const provider of providers) {
      if (provider.type === 'custom' && provider.config) {
        try {
          const config = JSON.parse(provider.config);
          customProviders.push(config);
        } catch (error) {
          console.warn(`解析自定义提供商配置失败: ${provider.name}`, error);
        }
      }
    }

    const config: ModelManagerConfig = {
      deepSeekEnabled: providers.some(p => p.type === 'deepseek'),
      zhipuEnabled: providers.some(p => p.type === 'zhipu'),
      kimiEnabled: providers.some(p => p.type === 'kimi'),
      customProviders
    };

    this.modelManager.updateConfig(config);
  }

  /**
   * 私有方法：更新模型管理器配置
   */
  private async updateModelManagerConfig(): Promise<void> {
    await this.initializeModelManager();
  }

  /**
   * 从环境变量加载初始配置
   */
  private async loadFromEnvironment(): Promise<void> {
    try {
      console.log('📥 读取环境配置...');
      const envConfig = envConfigService.getConfig();
      console.log('📊 环境配置提供商数量:', envConfig.providers.length);
      const existingProviders = await getAIProviders();
      console.log('📋 已存在的数据库提供商数量:', existingProviders.length);

      // 为每个环境配置的提供商创建或更新数据库记录
      for (const envProvider of envConfig.providers) {
        if (envProvider.apiKey) {
          console.log(`⚙️ 处理提供商: ${envProvider.name} (${envProvider.type})`);
          const existingProvider = existingProviders.find(p => p.type === envProvider.type);

          if (existingProvider) {
            // 检查是否已有用户设置的API密钥
            // 只有在没有用户设置的API密钥或密钥是从环境变量加载的情况下，才更新
            const configSource = await this.getConfigSource(existingProvider.id!);
            if (configSource === 'default' || configSource === 'environment') {
              await updateAIProvider(existingProvider.id!, {
                apiKey: encryptContent(envProvider.apiKey),
                enabled: envProvider.enabled,
                selectedModel: existingProvider.selectedModel || envProvider.defaultModel, // 保留用户选择的模型
                testStatus: 'success' as const,
                testMessage: '从环境变量加载'
              });
              console.log(`✅ 更新提供商 ${envProvider.name} 的环境配置`);
            } else {
              console.log(`⚠️ 跳过更新 ${envProvider.name}，用户已有自定义设置`);
            }
          } else {
            // 创建新的提供商记录
            await addAIProvider({
              name: envProvider.name,
              type: envProvider.type === 'openai' || envProvider.type === 'claude' ? 'custom' : envProvider.type,
              enabled: envProvider.enabled,
              apiKey: encryptContent(envProvider.apiKey),
              selectedModel: envProvider.defaultModel,
              testStatus: 'success' as const,
              testMessage: '从环境变量加载',
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
      }

      console.log('AI环境配置加载完成');
    } catch (error) {
      console.warn('从环境变量加载AI配置失败:', error);
    }
  }

  /**
   * 获取配置来源信息
   */
  async getConfigSource(providerId: number): Promise<'user' | 'environment' | 'default'> {
    try {
      const provider = await getAIProviders().then(providers =>
        providers.find(p => p.id === providerId)
      );

      if (!provider) return 'default';

      // 检查是否有用户设置的API密钥
      if (provider.apiKey) {
        const envProvider = envConfigService.getProviderConfig(provider.type);
        if (envProvider?.apiKey && provider.apiKey === encryptContent(envProvider.apiKey)) {
          return 'environment';
        }
        return 'user';
      }

      return 'default';
    } catch (error) {
      console.error('获取配置来源失败:', error);
      return 'default';
    }
  }

  /**
   * 从环境变量重新加载配置
   */
  async reloadFromEnvironment(): Promise<void> {
    try {
      // 清除现有缓存
      envConfigService.reloadConfig();

      // 重新加载环境配置
      await this.loadFromEnvironment();

      // 更新模型管理器
      await this.updateModelManagerConfig();

      console.log('AI环境配置重新加载完成');
    } catch (error) {
      console.error('重新加载环境配置失败:', error);
    }
  }

  /**
   * 私有方法：获取提供商API密钥
   */
  private getProviderApiKey(provider: DbAIProvider, credentials: ProviderCredentials): string | undefined {
    switch (provider.type) {
      case 'deepseek':
        return credentials.deepSeek;
      case 'zhipu':
        return credentials.zhipu;
      case 'kimi':
        return credentials.kimi;
      case 'custom':
        return credentials.custom[provider.name];
      default:
        return undefined;
    }
  }
}

// 导出单例实例
export const aiSettingsService = new AISettingsService();