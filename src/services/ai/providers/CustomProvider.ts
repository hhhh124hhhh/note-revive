/**
 * 自定义服务商实现
 * 支持OpenAI和Claude API兼容的服务商
 */

import { ModelProviderWithTest, ModelInfo, CustomProviderConfig, TestResult } from './types';
import { ModelCacheManager } from '../ModelCacheManager';

export class CustomProvider implements ModelProviderWithTest {
  public readonly name = '自定义';
  public readonly type = 'custom' as const;

  private cacheManager: ModelCacheManager;
  private config: CustomProviderConfig;

  constructor(cacheManager: ModelCacheManager, config: CustomProviderConfig) {
    this.cacheManager = cacheManager;
    this.config = config;
  }

  /**
   * 获取自定义服务商模型列表
   */
  async getModels(apiKey: string): Promise<ModelInfo[]> {
    // 检查缓存
    const cacheKey = `${this.config.name}:${this.config.baseUrl}`;
    const cachedModels = this.cacheManager.getCachedModels(cacheKey, apiKey);
    if (cachedModels) {
      return cachedModels;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          ...this.config.headers,
          'Authorization': this.getAuthHeader(apiKey),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const models = this.transformModels(data);

      // 缓存模型列表
      this.cacheManager.cacheModels(cacheKey, apiKey, models);

      return models;
    } catch (error) {
      console.error(`自定义服务商 ${this.config.name} 模型获取失败:`, error);
      // 返回默认模型列表作为降级方案
      return this.getDefaultModels();
    }
  }

  /**
   * 验证API密钥
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          ...this.config.headers,
          'Authorization': this.getAuthHeader(apiKey),
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error(`自定义服务商 ${this.config.name} API密钥验证失败:`, error);
      return false;
    }
  }

  /**
   * 测试API连接
   */
  async testConnection(apiKey: string): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          ...this.config.headers,
          'Authorization': this.getAuthHeader(apiKey),
          'Content-Type': 'application/json'
        }
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          message: `连接失败: HTTP ${response.status}`,
          responseTime,
          provider: this.config.name
        };
      }

      const data = await response.json();
      const modelCount = data.data?.length || 0;

      return {
        success: true,
        message: `连接成功，发现 ${modelCount} 个模型`,
        responseTime,
        provider: this.config.name,
        preview: `可用模型: ${modelCount} 个`
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        message: `网络错误: ${error instanceof Error ? error.message : '未知错误'}`,
        responseTime,
        provider: this.config.name
      };
    }
  }

  /**
   * 根据使用场景推荐模型
   */
  getRecommendedModel(useCase: 'search' | 'relation' | 'reminder' | 'general'): ModelInfo | null {
    const models = this.getDefaultModels();

    switch (useCase) {
      case 'search':
        // 搜索任务优先选择快速模型
        return models.find(m => m.id.includes('gpt-3.5') || m.id.includes('claude-instant')) || models[0];
      case 'relation':
        // 关联分析需要更强的推理能力
        return models.find(m => m.id.includes('gpt-4') || m.id.includes('claude-3')) || models[0];
      case 'reminder':
        // 提醒生成使用平衡的模型
        return models.find(m => m.id.includes('gpt-3.5') || m.id.includes('claude-instant')) || models[0];
      case 'general':
        // 通用任务使用默认推荐模型
        return models.find(m => m.recommended) || models[0];
      default:
        return models[0];
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: CustomProviderConfig): void {
    this.config = newConfig;
  }

  /**
   * 获取当前配置
   */
  getConfig(): CustomProviderConfig {
    return { ...this.config };
  }

  /**
   * 获取认证头
   */
  private getAuthHeader(apiKey: string): string {
    // 根据API类型决定认证方式
    switch (this.config.apiType) {
      case 'openai':
        return `Bearer ${apiKey}`;
      case 'claude':
        // Claude通常使用x-api-key
        return apiKey;
      default:
        return `Bearer ${apiKey}`;
    }
  }

  /**
   * 转换API响应为统一模型格式
   */
  private transformModels(apiData: any): ModelInfo[] {
    const models: ModelInfo[] = [];

    if (!apiData.data || !Array.isArray(apiData.data)) {
      return this.getDefaultModels();
    }

    for (const model of apiData.data) {
      const modelInfo = this.createModelInfo(model);
      if (modelInfo) {
        models.push(modelInfo);
      }
    }

    return models.length > 0 ? models : this.getDefaultModels();
  }

  /**
   * 根据API响应创建模型信息
   */
  private createModelInfo(model: any): ModelInfo | null {
    const modelId = model.id;
    let modelInfo: ModelInfo | null = null;

    if (this.config.apiType === 'openai') {
      modelInfo = this.createOpenAIModelInfo(model);
    } else if (this.config.apiType === 'claude') {
      modelInfo = this.createClaudeModelInfo(model);
    } else {
      // 通用处理
      modelInfo = {
        id: modelId,
        name: modelId.split('/').pop() || modelId,
        description: `${this.config.name} 模型`,
        maxTokens: 4096,
        pricing: {
          input: 0.001,
          output: 0.002,
          currency: 'USD'
        },
        capabilities: ['通用对话'],
        recommended: false,
        provider: this.config.name
      };
    }

    return modelInfo;
  }

  /**
   * 创建OpenAI兼容模型信息
   */
  private createOpenAIModelInfo(model: any): ModelInfo {
    const modelId = model.id;

    // 根据模型ID判断类型
    if (modelId.includes('gpt-4')) {
      return {
        id: modelId,
        name: modelId.replace('gpt-', 'GPT-').toUpperCase(),
        description: 'GPT-4系列模型，具有强大的理解和生成能力',
        maxTokens: this.getModelMaxTokens(modelId),
        pricing: {
          input: 0.03,
          output: 0.06,
          currency: 'USD'
        },
        capabilities: ['复杂对话', '代码生成', '分析推理', '创意写作'],
        recommended: modelId.includes('gpt-4') && !modelId.includes('32k') && !modelId.includes('turbo'),
        provider: this.config.name
      };
    } else if (modelId.includes('gpt-3.5')) {
      return {
        id: modelId,
        name: modelId.replace('gpt-', 'GPT-').toUpperCase(),
        description: 'GPT-3.5系列模型，适用于通用对话和快速响应',
        maxTokens: this.getModelMaxTokens(modelId),
        pricing: {
          input: 0.001,
          output: 0.002,
          currency: 'USD'
        },
        capabilities: ['通用对话', '快速响应', '文本生成', '基础分析'],
        recommended: modelId.includes('gpt-3.5-turbo') && !modelId.includes('16k'),
        provider: this.config.name
      };
    } else {
      // 其他OpenAI兼容模型
      return {
        id: modelId,
        name: modelId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `${this.config.name} 模型`,
        maxTokens: 4096,
        pricing: {
          input: 0.001,
          output: 0.002,
          currency: 'USD'
        },
        capabilities: ['通用对话'],
        recommended: false,
        provider: this.config.name
      };
    }
  }

  /**
   * 创建Claude兼容模型信息
   */
  private createClaudeModelInfo(model: any): ModelInfo {
    const modelId = model.id;

    if (modelId.includes('claude-3-opus')) {
      return {
        id: modelId,
        name: 'Claude 3 Opus',
        description: 'Claude 3 Opus模型，最强大的推理和分析能力',
        maxTokens: 200000,
        pricing: {
          input: 0.015,
          output: 0.075,
          currency: 'USD'
        },
        capabilities: ['复杂推理', '分析', '创意写作', '代码生成'],
        recommended: true,
        provider: this.config.name
      };
    } else if (modelId.includes('claude-3-sonnet')) {
      return {
        id: modelId,
        name: 'Claude 3 Sonnet',
        description: 'Claude 3 Sonnet模型，平衡性能与成本',
        maxTokens: 200000,
        pricing: {
          input: 0.003,
          output: 0.015,
          currency: 'USD'
        },
        capabilities: ['通用对话', '分析', '写作', '编程'],
        recommended: false,
        provider: this.config.name
      };
    } else if (modelId.includes('claude-3-haiku')) {
      return {
        id: modelId,
        name: 'Claude 3 Haiku',
        description: 'Claude 3 Haiku模型，快速响应和成本效益',
        maxTokens: 200000,
        pricing: {
          input: 0.00025,
          output: 0.00125,
          currency: 'USD'
        },
        capabilities: ['快速对话', '简单任务', '实时响应'],
        recommended: false,
        provider: this.config.name
      };
    } else {
      // 其他Claude兼容模型
      return {
        id: modelId,
        name: model.display_name || modelId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `${this.config.name} Claude兼容模型`,
        maxTokens: model.context_window || 100000,
        pricing: {
          input: 0.003,
          output: 0.015,
          currency: 'USD'
        },
        capabilities: ['通用对话'],
        recommended: false,
        provider: this.config.name
      };
    }
  }

  /**
   * 获取模型最大token数
   */
  private getModelMaxTokens(modelId: string): number {
    if (modelId.includes('32k')) return 32768;
    if (modelId.includes('16k')) return 16384;
    if (modelId.includes('gpt-4')) return 8192;
    if (modelId.includes('gpt-3.5')) return 4096;
    return 4096;
  }

  /**
   * 获取默认模型列表（用于降级）
   */
  private getDefaultModels(): ModelInfo[] {
    if (this.config.apiType === 'claude') {
      return [
        {
          id: 'claude-3-opus-20240229',
          name: 'Claude 3 Opus',
          description: 'Claude 3 Opus模型，最强大的推理和分析能力',
          maxTokens: 200000,
          pricing: {
            input: 0.015,
            output: 0.075,
            currency: 'USD'
          },
          capabilities: ['复杂推理', '分析', '创意写作', '代码生成'],
          recommended: true,
          provider: this.config.name
        },
        {
          id: 'claude-3-sonnet-20240229',
          name: 'Claude 3 Sonnet',
          description: 'Claude 3 Sonnet模型，平衡性能与成本',
          maxTokens: 200000,
          pricing: {
            input: 0.003,
            output: 0.015,
            currency: 'USD'
          },
          capabilities: ['通用对话', '分析', '写作', '编程'],
          recommended: false,
          provider: this.config.name
        },
        {
          id: 'claude-3-haiku-20240307',
          name: 'Claude 3 Haiku',
          description: 'Claude 3 Haiku模型，快速响应和成本效益',
          maxTokens: 200000,
          pricing: {
            input: 0.00025,
            output: 0.00125,
            currency: 'USD'
          },
          capabilities: ['快速对话', '简单任务', '实时响应'],
          recommended: false,
          provider: this.config.name
        }
      ];
    } else {
      // OpenAI兼容
      return [
        {
          id: 'gpt-4-turbo-preview',
          name: 'GPT-4 Turbo',
          description: 'GPT-4 Turbo模型，具有强大的理解和生成能力',
          maxTokens: 128000,
          pricing: {
            input: 0.01,
            output: 0.03,
            currency: 'USD'
          },
          capabilities: ['复杂对话', '代码生成', '分析推理', '创意写作'],
          recommended: true,
          provider: this.config.name
        },
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          description: 'GPT-3.5 Turbo模型，适用于通用对话和快速响应',
          maxTokens: 16385,
          pricing: {
            input: 0.0005,
            output: 0.0015,
            currency: 'USD'
          },
          capabilities: ['通用对话', '快速响应', '文本生成', '基础分析'],
          recommended: false,
          provider: this.config.name
        }
      ];
    }
  }
}