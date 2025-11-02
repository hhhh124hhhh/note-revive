/**
 * 智谱AI GLM 服务商实现
 * 支持模型列表获取和API密钥验证
 */

import { ModelProviderWithTest, ModelInfo, TestResult } from './types';
import { ModelCacheManager } from '../ModelCacheManager';

export class ZhipuProvider implements ModelProviderWithTest {
  public readonly name = '智谱AI';
  public readonly type = 'zhipu' as const;

  private cacheManager: ModelCacheManager;
  private readonly baseUrl = 'https://open.bigmodel.cn/api/paas/v4';

  constructor(cacheManager: ModelCacheManager) {
    this.cacheManager = cacheManager;
  }

  /**
   * 获取智谱AI模型列表
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
      console.error('智谱AI模型获取失败:', error);
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
      console.error('智谱AI API密钥验证失败:', error);
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
        // 搜索任务使用GLM-4-Flash快速模型
        return models.find(m => m.id.includes('glm-4-flash')) || models[0];
      case 'relation':
        // 关联分析使用GLM-4-Plus增强模型
        return models.find(m => m.id.includes('glm-4-plus')) || models[0];
      case 'reminder':
        // 提醒生成使用GLM-4标准模型
        return models.find(m => m.id.includes('glm-4')) || models[0];
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

    if (modelId.includes('glm-4-flash')) {
      modelInfo = {
        id: modelId,
        name: 'GLM-4-Flash',
        description: '智谱AI快速响应模型，适用于实时对话、快速搜索和简单任务',
        maxTokens: 128000,
        pricing: {
          input: 0.01,    // 每1K tokens价格 (人民币)
          output: 0.01,
          currency: 'CNY'
        },
        capabilities: ['快速对话', '搜索', '简单任务', '实时响应'],
        recommended: false,
        provider: this.name
      };
    } else if (modelId.includes('glm-4-air')) {
      modelInfo = {
        id: modelId,
        name: 'GLM-4-Air',
        description: '智谱AI轻量级模型，平衡性能与成本，适用于一般任务',
        maxTokens: 128000,
        pricing: {
          input: 0.01,
          output: 0.01,
          currency: 'CNY'
        },
        capabilities: ['通用对话', '内容生成', '搜索', '分析'],
        recommended: true,
        provider: this.name
      };
    } else if (modelId.includes('glm-4')) {
      modelInfo = {
        id: modelId,
        name: 'GLM-4',
        description: '智谱AI标准模型，适用于通用对话、内容生成和复杂任务',
        maxTokens: 128000,
        pricing: {
          input: 0.025,
          output: 0.025,
          currency: 'CNY'
        },
        capabilities: ['通用对话', '内容生成', '复杂任务', '代码生成'],
        recommended: false,
        provider: this.name
      };
    } else if (modelId.includes('glm-4-plus')) {
      modelInfo = {
        id: modelId,
        name: 'GLM-4-Plus',
        description: '智谱AI增强模型，具有更强的理解和生成能力，适用于复杂任务',
        maxTokens: 128000,
        pricing: {
          input: 0.05,
          output: 0.05,
          currency: 'CNY'
        },
        capabilities: ['复杂对话', '深度分析', '专业内容', '多轮对话'],
        recommended: false,
        provider: this.name
      };
    } else if (modelId.includes('glm-4-long')) {
      modelInfo = {
        id: modelId,
        name: 'GLM-4-Long',
        description: '智谱AI长文本模型，支持超长上下文理解和生成',
        maxTokens: 1000000,
        pricing: {
          input: 0.05,
          output: 0.05,
          currency: 'CNY'
        },
        capabilities: ['长文本理解', '文档分析', '长内容生成', '论文处理'],
        recommended: false,
        provider: this.name
      };
    } else if (modelId.includes('glm-4v')) {
      modelInfo = {
        id: modelId,
        name: 'GLM-4V',
        description: '智谱AI多模态模型，支持图像理解和分析',
        maxTokens: 8000,
        pricing: {
          input: 0.025,
          output: 0.025,
          currency: 'CNY'
        },
        capabilities: ['图像理解', '多模态对话', '视觉分析', '图文处理'],
        recommended: false,
        provider: this.name
      };
    } else if (modelId.includes('glm-3-turbo')) {
      modelInfo = {
        id: modelId,
        name: 'GLM-3-Turbo',
        description: '智谱AI Turbo模型，高速响应，适用于高频交互场景',
        maxTokens: 128000,
        pricing: {
          input: 0.005,
          output: 0.005,
          currency: 'CNY'
        },
        capabilities: ['高速对话', '高频交互', '实时搜索', '快速响应'],
        recommended: false,
        provider: this.name
      };
    } else {
      // 未知模型，使用默认配置
      modelInfo = {
        id: modelId,
        name: modelId.replace('glm-', 'GLM-').toUpperCase(),
        description: '智谱AI GLM模型',
        maxTokens: 128000,
        pricing: {
          input: 0.025,
          output: 0.025,
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
        id: 'glm-4-flash',
        name: 'GLM-4-Flash',
        description: '智谱AI快速响应模型，适用于实时对话、快速搜索和简单任务',
        maxTokens: 128000,
        pricing: {
          input: 0.01,    // 每1K tokens价格 (人民币)
          output: 0.01,
          currency: 'CNY'
        },
        capabilities: ['快速对话', '搜索', '简单任务', '实时响应'],
        recommended: false,
        provider: this.name
      },
      {
        id: 'glm-4-air',
        name: 'GLM-4-Air',
        description: '智谱AI轻量级模型，平衡性能与成本，适用于一般任务',
        maxTokens: 128000,
        pricing: {
          input: 0.01,
          output: 0.01,
          currency: 'CNY'
        },
        capabilities: ['通用对话', '内容生成', '搜索', '分析'],
        recommended: true,
        provider: this.name
      },
      {
        id: 'glm-4',
        name: 'GLM-4',
        description: '智谱AI标准模型，适用于通用对话、内容生成和复杂任务',
        maxTokens: 128000,
        pricing: {
          input: 0.025,
          output: 0.025,
          currency: 'CNY'
        },
        capabilities: ['通用对话', '内容生成', '复杂任务', '代码生成'],
        recommended: false,
        provider: this.name
      },
      {
        id: 'glm-4-plus',
        name: 'GLM-4-Plus',
        description: '智谱AI增强模型，具有更强的理解和生成能力，适用于复杂任务',
        maxTokens: 128000,
        pricing: {
          input: 0.05,
          output: 0.05,
          currency: 'CNY'
        },
        capabilities: ['复杂对话', '深度分析', '专业内容', '多轮对话'],
        recommended: false,
        provider: this.name
      },
      {
        id: 'glm-4-long',
        name: 'GLM-4-Long',
        description: '智谱AI长文本模型，支持超长上下文理解和生成',
        maxTokens: 1000000,
        pricing: {
          input: 0.05,
          output: 0.05,
          currency: 'CNY'
        },
        capabilities: ['长文本理解', '文档分析', '长内容生成', '论文处理'],
        recommended: false,
        provider: this.name
      },
      {
        id: 'glm-4v',
        name: 'GLM-4V',
        description: '智谱AI多模态模型，支持图像理解和分析',
        maxTokens: 8000,
        pricing: {
          input: 0.025,
          output: 0.025,
          currency: 'CNY'
        },
        capabilities: ['图像理解', '多模态对话', '视觉分析', '图文处理'],
        recommended: false,
        provider: this.name
      }
    ];
  }
}