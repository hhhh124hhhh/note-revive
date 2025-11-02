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

  constructor() {
    this.modelManager = new ModelManager();
  }

  /**
   * 初始化AI设置服务
   */
  async initialize(): Promise<void> {
    try {
      console.log('开始初始化AI设置服务...');

      // 初始化默认提供商
      console.log('初始化默认AI提供商...');
      await initDefaultAIProviders();

      // 验证提供商是否正确创建
      const providers = await getAIProviders();
      console.log(`已加载 ${providers.length} 个AI提供商:`, providers.map(p => p.name));

      // 从环境变量加载初始配置
      console.log('从环境变量加载配置...');
      await this.loadFromEnvironment();

      // 迁移旧版本设置
      console.log('迁移旧版本设置...');
      await migrateAISettings();

      // 初始化模型管理器
      console.log('初始化模型管理器...');
      await this.initializeModelManager();

      console.log('AI设置服务初始化完成');
    } catch (error) {
      console.error('AI设置服务初始化失败:', error);
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

      if (!apiKey) {
        throw new Error('缺少API密钥');
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
        models
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '测试失败';

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
      const envConfig = envConfigService.getConfig();
      const existingProviders = await getAIProviders();

      // 为每个环境配置的提供商创建或更新数据库记录
      for (const envProvider of envConfig.providers) {
        if (envProvider.apiKey) {
          const existingProvider = existingProviders.find(p => p.type === envProvider.type);

          if (existingProvider) {
            // 更新现有提供商（仅当没有用户设置时）
            if (!existingProvider.apiKey) {
              await updateAIProvider(existingProvider.id!, {
                apiKey: encryptContent(envProvider.apiKey),
                enabled: envProvider.enabled,
                selectedModel: envProvider.defaultModel,
                testStatus: 'success' as const,
                testMessage: '从环境变量加载'
              });
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