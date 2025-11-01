/**
 * AI服务统一导出
 */

// 类型定义
export * from './types';

// 核心组件
export { ModelCacheManager } from './ModelCacheManager';
export { ModelRecommendationEngine, type RecommendationCriteria, type RecommendationResult } from './ModelRecommendationEngine';
export { ModelManager, type ModelManagerConfig, type ProviderCredentials } from './ModelManager';

// 服务商实现
export { DeepSeekProvider } from './providers/DeepSeekProvider';
export { ZhipuProvider } from './providers/ZhipuProvider';
export { KimiProvider } from './providers/KimiProvider';
export { CustomProvider } from './providers/CustomProvider';
export { ModelProviderWithTest } from './providers/types';

// AI设置服务
export { AISettingsService, aiSettingsService } from './AISettingsService';
export type { AISettings, ProviderTestResult } from './AISettingsService';

// 便捷工厂函数
export function createModelManager(config?: ModelManagerConfig): ModelManager {
  return new ModelManager(config);
}

export function createRecommendationEngine(): ModelRecommendationEngine {
  return new ModelRecommendationEngine();
}

export function createCacheManager(): ModelCacheManager {
  return new ModelCacheManager();
}

export function createAISettingsService(): AISettingsService {
  return new AISettingsService();
}

// 默认配置
export const DEFAULT_MODEL_MANAGER_CONFIG: ModelManagerConfig = {
  deepSeekEnabled: true,
  zhipuEnabled: true,
  kimiEnabled: true,
  customProviders: []
};

export const DEFAULT_RECOMMENDATION_CRITERIA: RecommendationCriteria = {
  useCase: 'general',
  prioritySpeed: true,
  priorityQuality: false,
  maxCostPerRequest: 0.01
};