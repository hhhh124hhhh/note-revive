/**
 * Kimi Moonshot 服务商实现
 * 支持模型列表获取和API密钥验证
 */

import { ModelProviderWithTest, ModelInfo, CustomProviderConfig, TestResult } from './types';
import { ModelCacheManager } from '../ModelCacheManager';

export class KimiProvider implements ModelProviderWithTest {
  public readonly name = 'Kimi';
  public readonly type = 'kimi' as const;

  private cacheManager: ModelCacheManager;
  private readonly baseUrl = 'https://api.moonshot.cn/v1';

  constructor(cacheManager: ModelCacheManager) {
    this.cacheManager = cacheManager;
  }

  /**
   * 获取Kimi模型列表
   */
  async getModels(apiKey: string): Promise<ModelInfo[]> {
    // 检查缓存
    const cachedModels = this.cacheManager.getCachedModels(this.type, apiKey);
    if (cachedModels) {
      return cachedModels;
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const models = this.transformModels(data);

      // 缓存模型列表
      this.cacheManager.cacheModels(this.type, apiKey, models);

      return models;
    } catch (error) {
      console.error('Kimi模型获取失败:', error);
      // 返回默认模型列表作为降级方案
      return this.getDefaultModels();
    }
  }

  /**
   * 验证API密钥
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Kimi API密钥验证失败:', error);
      return false;
    }
  }

  /**
   * 测试API连接
   */
  async testConnection(apiKey: string): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          message: `连接失败: HTTP ${response.status}`,
          responseTime,
          provider: this.name
        };
      }

      const data = await response.json();
      const modelCount = data.data?.length || 0;

      return {
        success: true,
        message: `连接成功，发现 ${modelCount} 个模型`,
        responseTime,
        provider: this.name,
        preview: `可用模型: ${modelCount} 个`
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        message: `网络错误: ${error instanceof Error ? error.message : '未知错误'}`,
        responseTime,
        provider: this.name
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
        // 搜索任务使用moonshot-v1-8k快速模型
        return models.find(m => m.id.includes('moonshot-v1-8k')) || models[0];
      case 'relation':
        // 关联分析使用moonshot-v1-32k增强模型
        return models.find(m => m.id.includes('moonshot-v1-32k')) || models[0];
      case 'reminder':
        // 提醒生成使用moonshot-v1-8k标准模型
        return models.find(m => m.id.includes('moonshot-v1-8k')) || models[0];
      case 'general':
        // 通用任务使用默认推荐模型
        return models.find(m => m.recommended) || models[0];
      default:
        return models[0];
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

    // 根据模型ID判断模型类型和规格
    let modelInfo: ModelInfo | null = null;

    if (modelId.includes('moonshot-v1-8k')) {
      modelInfo = {
        id: modelId,
        name: 'Moonshot v1 8K',
        description: 'Kimi 8K上下文模型，适用于快速对话、搜索和短文本处理',
        maxTokens: 8000,
        pricing: {
          input: 0.012,    // 每1K tokens价格 (人民币)
          output: 0.012,
          currency: 'CNY'
        },
        capabilities: ['快速对话', '搜索', '短文本处理', '实时响应'],
        recommended: true,
        provider: this.name
      };
    } else if (modelId.includes('moonshot-v1-32k')) {
      modelInfo = {
        id: modelId,
        name: 'Moonshot v1 32K',
        description: 'Kimi 32K上下文模型，适用于长文档分析和复杂任务处理',
        maxTokens: 32000,
        pricing: {
          input: 0.024,
          output: 0.06,
          currency: 'CNY'
        },
        capabilities: ['长文档分析', '复杂任务', '多轮对话', '深度搜索'],
        recommended: false,
        provider: this.name
      };
    } else if (modelId.includes('moonshot-v1-128k')) {
      modelInfo = {
        id: modelId,
        name: 'Moonshot v1 128K',
        description: 'Kimi 128K超长上下文模型，支持超长文档处理和分析',
        maxTokens: 128000,
        pricing: {
          input: 0.06,
          output: 0.12,
          currency: 'CNY'
        },
        capabilities: ['超长文档处理', '论文分析', '报告生成', '知识库问答'],
        recommended: false,
        provider: this.name
      };
    } else {
      // 未知模型，使用默认配置
      modelInfo = {
        id: modelId,
        name: modelId.replace('moonshot-', 'Moonshot ').replace(/-/g, ' ').split(' ').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        description: 'Kimi Moonshot模型',
        maxTokens: 8000,
        pricing: {
          input: 0.012,
          output: 0.012,
          currency: 'CNY'
        },
        capabilities: ['通用对话'],
        recommended: false,
        provider: this.name
      };
    }

    return modelInfo;
  }

  /**
   * 获取默认模型列表（用于降级）
   */
  private getDefaultModels(): ModelInfo[] {
    return [
      {
        id: 'moonshot-v1-8k',
        name: 'Moonshot v1 8K',
        description: 'Kimi 8K上下文模型，适用于快速对话、搜索和短文本处理',
        maxTokens: 8000,
        pricing: {
          input: 0.012,    // 每1K tokens价格 (人民币)
          output: 0.012,
          currency: 'CNY'
        },
        capabilities: ['快速对话', '搜索', '短文本处理', '实时响应'],
        recommended: true,
        provider: this.name
      },
      {
        id: 'moonshot-v1-32k',
        name: 'Moonshot v1 32K',
        description: 'Kimi 32K上下文模型，适用于长文档分析和复杂任务处理',
        maxTokens: 32000,
        pricing: {
          input: 0.024,
          output: 0.06,
          currency: 'CNY'
        },
        capabilities: ['长文档分析', '复杂任务', '多轮对话', '深度搜索'],
        recommended: false,
        provider: this.name
      },
      {
        id: 'moonshot-v1-128k',
        name: 'Moonshot v1 128K',
        description: 'Kimi 128K超长上下文模型，支持超长文档处理和分析',
        maxTokens: 128000,
        pricing: {
          input: 0.06,
          output: 0.12,
          currency: 'CNY'
        },
        capabilities: ['超长文档处理', '论文分析', '报告生成', '知识库问答'],
        recommended: false,
        provider: this.name
      }
    ];
  }
}