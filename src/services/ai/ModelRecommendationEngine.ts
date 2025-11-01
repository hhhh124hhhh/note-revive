/**
 * 智能模型推荐引擎
 * 根据用户使用场景、成本预算、性能需求等因素推荐最合适的模型
 */

import { ModelInfo, ModelUseCase, ModelScore } from './types';
import { ModelProvider } from './providers/types';

export interface RecommendationCriteria {
  useCase: ModelUseCase;
  maxCostPerRequest?: number;  // 每次请求最大成本 (USD)
  prioritySpeed?: boolean;     // 是否优先考虑速度
  priorityQuality?: boolean;   // 是否优先考虑质量
  excludeModels?: string[];    // 排除的模型ID列表
  provider?: string;           // 指定服务商
  maxTokens?: number;          // 所需最大token数
}

export interface RecommendationResult {
  recommended: ModelInfo;
  alternatives: ModelInfo[];
  reasoning: string;
  estimatedCost: {
    input: number;
    output: number;
    total: number;
  };
  confidence: number;
}

export class ModelRecommendationEngine {
  private providers: Map<string, ModelProvider> = new Map();

  /**
   * 注册模型提供商
   */
  registerProvider(provider: ModelProvider): void {
    this.providers.set(provider.type, provider);
  }

  /**
   * 获取模型推荐
   */
  async recommend(criteria: RecommendationCriteria): Promise<RecommendationResult | null> {
    const allModels = await this.getAllAvailableModels(criteria);
    const scoredModels = this.scoreModels(allModels, criteria);

    if (scoredModels.length === 0) {
      return null;
    }

    const topScore = scoredModels[0];
    const recommended = topScore.model;
    const alternatives = scoredModels.slice(1, 4).map(s => s.model); // 前3个备选

    // 计算预估成本
    const estimatedCost = this.calculateEstimatedCost(recommended, criteria);

    return {
      recommended,
      alternatives,
      reasoning: topScore.reason,
      estimatedCost,
      confidence: topScore.score
    };
  }

  /**
   * 批量获取推荐
   */
  async batchRecommend(criteriaList: RecommendationCriteria[]): Promise<RecommendationResult[]> {
    const results: RecommendationResult[] = [];

    for (const criteria of criteriaList) {
      const result = await this.recommend(criteria);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 分析模型使用统计
   */
  analyzeUsageStats(models: ModelInfo[], usageData: any[]): {
    mostUsed: ModelInfo;
    mostCostEffective: ModelInfo;
    fastest: ModelInfo;
    recommendations: string[];
  } {
    // 这里可以根据实际使用数据进行分析
    // 目前返回基于静态数据的分析结果
    const mostUsed = models.find(m => m.recommended) || models[0];
    const mostCostEffective = this.findMostCostEffective(models);
    const fastest = this.findFastest(models);

    const recommendations = this.generateRecommendations(models, usageData);

    return {
      mostUsed,
      mostCostEffective,
      fastest,
      recommendations
    };
  }

  /**
   * 获取所有可用的模型
   */
  private async getAllAvailableModels(criteria: RecommendationCriteria): Promise<ModelInfo[]> {
    const allModels: ModelInfo[] = [];

    for (const [providerType, provider] of this.providers) {
      if (criteria.provider && providerType !== criteria.provider) {
        continue;
      }

      try {
        // 这里需要API密钥，实际使用时需要从设置中获取
        // 暂时使用默认模型列表
        const recommendedModel = provider.getRecommendedModel(criteria.useCase);
        if (recommendedModel) {
          allModels.push(recommendedModel);
        }
      } catch (error) {
        console.warn(`获取 ${provider.name} 模型失败:`, error);
      }
    }

    return this.filterModels(allModels, criteria);
  }

  /**
   * 过滤模型
   */
  private filterModels(models: ModelInfo[], criteria: RecommendationCriteria): ModelInfo[] {
    return models.filter(model => {
      // 排除指定模型
      if (criteria.excludeModels?.includes(model.id)) {
        return false;
      }

      // 检查token数量需求
      if (criteria.maxTokens && model.maxTokens < criteria.maxTokens) {
        return false;
      }

      // 检查成本限制
      if (criteria.maxCostPerRequest) {
        const estimatedCost = this.calculateModelCost(model, criteria);
        if (estimatedCost.total > criteria.maxCostPerRequest) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 为模型评分
   */
  private scoreModels(models: ModelInfo[], criteria: RecommendationCriteria): ModelScore[] {
    return models
      .map(model => ({
        model,
        score: this.calculateScore(model, criteria),
        reason: this.generateReason(model, criteria)
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * 计算模型评分
   */
  private calculateScore(model: ModelInfo, criteria: RecommendationCriteria): number {
    let score = 0;

    // 基础评分
    score += model.recommended ? 30 : 0;

    // 根据使用场景评分
    const useCaseScore = this.getUseCaseScore(model, criteria.useCase);
    score += useCaseScore;

    // 成本评分 (越便宜越好)
    const costScore = this.getCostScore(model);
    score += costScore;

    // 性能评分
    if (criteria.prioritySpeed) {
      score += this.getSpeedScore(model);
    }

    if (criteria.priorityQuality) {
      score += this.getQualityScore(model);
    }

    // 容量评分
    if (criteria.maxTokens) {
      const capacityScore = this.getCapacityScore(model, criteria.maxTokens);
      score += capacityScore;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * 根据使用场景获取评分
   */
  private getUseCaseScore(model: ModelInfo, useCase: ModelUseCase): number {
    const capabilities = model.capabilities.map(c => c.toLowerCase());

    switch (useCase) {
      case 'search':
        if (capabilities.some(cap => cap.includes('搜索') || cap.includes('search'))) return 25;
        if (capabilities.some(cap => cap.includes('快速') || cap.includes('fast'))) return 20;
        return 10;
      case 'relation':
        if (capabilities.some(cap => cap.includes('推理') || cap.includes('分析'))) return 25;
        if (capabilities.some(cap => cap.includes('复杂'))) return 20;
        return 10;
      case 'reminder':
        if (capabilities.some(cap => cap.includes('生成') || cap.includes('对话'))) return 25;
        if (capabilities.some(cap => cap.includes('写作'))) return 20;
        return 10;
      case 'general':
        if (capabilities.some(cap => cap.includes('通用'))) return 25;
        if (model.recommended) return 20;
        return 10;
      default:
        return 10;
    }
  }

  /**
   * 获取成本评分
   */
  private getCostScore(model: ModelInfo): number {
    const avgCost = (model.pricing.input + model.pricing.output) / 2;

    // 按成本区间评分
    if (avgCost <= 0.001) return 20; // 非常便宜
    if (avgCost <= 0.01) return 15;  // 便宜
    if (avgCost <= 0.05) return 10;  // 中等
    if (avgCost <= 0.1) return 5;    // 较贵
    return 0; // 很贵
  }

  /**
   * 获取速度评分
   */
  private getSpeedScore(model: ModelInfo): number {
    // 根据模型类型推测速度
    if (model.id.includes('flash') || model.id.includes('turbo') || model.id.includes('haiku')) {
      return 15;
    }
    if (model.id.includes('instant') || model.id.includes('lite')) {
      return 12;
    }
    if (model.id.includes('opus') || model.id.includes('plus')) {
      return 5;
    }
    return 8;
  }

  /**
   * 获取质量评分
   */
  private getQualityScore(model: ModelInfo): number {
    // 根据模型类型推测质量
    if (model.id.includes('opus') || model.id.includes('gpt-4') || model.id.includes('claude-3')) {
      return 15;
    }
    if (model.id.includes('plus') || model.id.includes('sonnet')) {
      return 12;
    }
    if (model.id.includes('flash') || model.id.includes('instant') || model.id.includes('haiku')) {
      return 5;
    }
    return 8;
  }

  /**
   * 获取容量评分
   */
  private getCapacityScore(model: ModelInfo, requiredTokens: number): number {
    const ratio = model.maxTokens / requiredTokens;

    if (ratio >= 2) return 15;  // 容量充足
    if (ratio >= 1.5) return 12; // 容量较好
    if (ratio >= 1) return 8;    // 容量刚好
    return 0; // 容量不足
  }

  /**
   * 生成推荐理由
   */
  private generateReason(model: ModelInfo, criteria: RecommendationCriteria): string {
    const reasons: string[] = [];

    if (model.recommended) {
      reasons.push('官方推荐模型');
    }

    // 基于使用场景的理由
    switch (criteria.useCase) {
      case 'search':
        reasons.push('适合搜索任务');
        break;
      case 'relation':
        reasons.push('适合关联分析');
        break;
      case 'reminder':
        reasons.push('适合提醒生成');
        break;
      case 'general':
        reasons.push('通用性能优秀');
        break;
    }

    // 基于优先级的理由
    if (criteria.prioritySpeed) {
      reasons.push('响应速度快');
    }
    if (criteria.priorityQuality) {
      reasons.push('输出质量高');
    }

    // 基于成本的理由
    const avgCost = (model.pricing.input + model.pricing.output) / 2;
    if (avgCost <= 0.001) {
      reasons.push('成本极低');
    } else if (avgCost <= 0.01) {
      reasons.push('成本较低');
    }

    return reasons.join('，');
  }

  /**
   * 计算预估成本
   */
  private calculateEstimatedCost(model: ModelInfo, criteria: RecommendationCriteria): {
    input: number;
    output: number;
    total: number;
  } {
    // 假设平均使用情况
    const avgInputTokens = 1000;
    const avgOutputTokens = 500;

    const inputCost = (avgInputTokens / 1000) * model.pricing.input;
    const outputCost = (avgOutputTokens / 1000) * model.pricing.output;

    return {
      input: inputCost,
      output: outputCost,
      total: inputCost + outputCost
    };
  }

  /**
   * 计算模型成本
   */
  private calculateModelCost(model: ModelInfo, criteria: RecommendationCriteria): {
    input: number;
    output: number;
    total: number;
  } {
    return this.calculateEstimatedCost(model, criteria);
  }

  /**
   * 找到成本效益最高的模型
   */
  private findMostCostEffective(models: ModelInfo[]): ModelInfo {
    return models.reduce((best, current) => {
      const bestCost = (best.pricing.input + best.pricing.output) / 2;
      const currentCost = (current.pricing.input + current.pricing.output) / 2;
      return currentCost < bestCost ? current : best;
    });
  }

  /**
   * 找到最快的模型
   */
  private findFastest(models: ModelInfo[]): ModelInfo {
    // 简单启发式：根据模型名称推测速度
    return models.reduce((best, current) => {
      const bestSpeed = this.getSpeedScore(best);
      const currentSpeed = this.getSpeedScore(current);
      return currentSpeed > bestSpeed ? current : best;
    });
  }

  /**
   * 生成使用建议
   */
  private generateRecommendations(models: ModelInfo[], usageData: any[]): string[] {
    const recommendations: string[] = [];

    if (models.length === 0) {
      recommendations.push('建议配置更多AI服务商以获得更好的模型选择');
      return recommendations;
    }

    const costEffective = this.findMostCostEffective(models);
    const fastest = this.findFastest(models);

    recommendations.push(`推荐使用 ${costEffective.name} 以降低成本`);
    recommendations.push(`需要快速响应时可选择 ${fastest.name}`);

    return recommendations;
  }
}