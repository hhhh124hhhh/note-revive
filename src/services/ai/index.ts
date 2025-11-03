/**
 * AI服务统一导出
 */

// 类型定义
export type * from './types';

// 核心组件
export { ModelCacheManager } from './ModelCacheManager';
export { ModelRecommendationEngine, type RecommendationCriteria, type RecommendationResult } from './ModelRecommendationEngine';
export { ModelManager, type ModelManagerConfig, type ProviderCredentials } from './ModelManager';

// 服务商实现
export { DeepSeekProvider } from './providers/DeepSeekProvider';
export { ZhipuProvider } from './providers/ZhipuProvider';
export { KimiProvider } from './providers/KimiProvider';
export { CustomProvider } from './providers/CustomProvider';
export type { ModelProviderWithTest } from './providers/types';

// AI设置服务
export { AISettingsService, aiSettingsService } from './AISettingsService';
export type { AISettings, ProviderTestResult } from './AISettingsService';

// AI功能管理器
export {
  aiFeatureManager,
  isAIAvailable,
  getAIStatus,
  initializeAI,
  safeGetAIService,
  safeExecuteAI
} from './AIFeatureManager';
export type { AIFeatureStatus, AIConfiguration } from './AIFeatureManager';