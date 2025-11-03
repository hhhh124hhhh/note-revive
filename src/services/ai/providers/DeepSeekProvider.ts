/**
 * DeepSeek AI 服务商实现
 * 支持模型列表获取和API密钥验证
 */

import { ModelProviderWithTest, ModelInfo, TestResult } from './types';
import { ModelCacheManager } from '../ModelCacheManager';

export class DeepSeekProvider implements ModelProviderWithTest {
  public readonly name = 'DeepSeek';
  public readonly type = 'deepseek' as const;

  private cacheManager: ModelCacheManager;
  private readonly baseUrl = 'https://api.deepseek.com';

  constructor(cacheManager: ModelCacheManager) {
    this.cacheManager = cacheManager;
  }

  /**
   * 获取DeepSeek模型列表
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
      console.error('DeepSeek模型获取失败:', error);
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
      console.error('DeepSeek API密钥验证失败:', error);
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
        // 搜索任务优先选择快速模型
        return models.find(m => m.id.includes('deepseek-chat')) || models[0];
      case 'relation':
        // 关联分析需要更强的推理能力
        return models.find(m => m.id.includes('deepseek-reasoner')) || models[0];
      case 'reminder':
        // 提醒生成使用平衡的模型
        return models.find(m => m.id.includes('deepseek-chat')) || models[0];
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

    if (modelId.includes('deepseek-chat')) {
      modelInfo = {
        id: modelId,
        name: 'DeepSeek Chat',
        description: 'DeepSeek对话模型，适用于通用对话、搜索和内容生成任务',
        maxTokens: 4096,
        pricing: {
          input: 0.14,    // 每1K tokens价格 (美元)
          output: 0.28,
          currency: 'USD'
        },
        capabilities: ['对话', '搜索', '内容生成', '代码生成'],
        recommended: true,
        provider: this.name
      };
    } else if (modelId.includes('deepseek-coder')) {
      modelInfo = {
        id: modelId,
        name: 'DeepSeek Coder',
        description: 'DeepSeek代码模型，专门优化代码生成和理解任务',
        maxTokens: 4096,
        pricing: {
          input: 0.19,
          output: 0.38,
          currency: 'USD'
        },
        capabilities: ['代码生成', '代码理解', '调试', '技术文档'],
        recommended: false,
        provider: this.name
      };
    } else if (modelId.includes('deepseek-reasoner')) {
      modelInfo = {
        id: modelId,
        name: 'DeepSeek Reasoner',
        description: 'DeepSeek推理模型，强化逻辑推理和复杂问题解决能力',
        maxTokens: 4096,
        pricing: {
          input: 0.55,
          output: 2.19,
          currency: 'USD'
        },
        capabilities: ['逻辑推理', '复杂问题解决', '数学推理', '分析'],
        recommended: false,
        provider: this.name
      };
    } else {
      // 未知模型，使用默认配置
      modelInfo = {
        id: modelId,
        name: modelId.replace('deepseek-', 'DeepSeek ').split('-').map((word: string) =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        description: 'DeepSeek AI模型',
        maxTokens: 4096,
        pricing: {
          input: 0.14,
          output: 0.28,
          currency: 'USD'
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
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        description: 'DeepSeek对话模型，适用于通用对话、搜索和内容生成任务',
        maxTokens: 4096,
        pricing: {
          input: 0.14,    // 每1K tokens价格 (美元)
          output: 0.28,
          currency: 'USD'
        },
        capabilities: ['对话', '搜索', '内容生成', '代码生成'],
        recommended: true,
        provider: this.name
      },
      {
        id: 'deepseek-coder',
        name: 'DeepSeek Coder',
        description: 'DeepSeek代码模型，专门优化代码生成和理解任务',
        maxTokens: 4096,
        pricing: {
          input: 0.19,
          output: 0.38,
          currency: 'USD'
        },
        capabilities: ['代码生成', '代码理解', '调试', '技术文档'],
        recommended: false,
        provider: this.name
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek Reasoner',
        description: 'DeepSeek推理模型，强化逻辑推理和复杂问题解决能力',
        maxTokens: 4096,
        pricing: {
          input: 0.55,
          output: 2.19,
          currency: 'USD'
        },
        capabilities: ['逻辑推理', '复杂问题解决', '数学推理', '分析'],
        recommended: false,
        provider: this.name
      }
    ];
  }
}