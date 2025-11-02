/**
 * AI服务提供商类型定义
 */

import { ModelInfo, CustomProviderConfig, TestResult } from '../types';

// 重新导出类型以便其他文件使用
export type { ModelInfo, CustomProviderConfig, TestResult } from '../types';

// 服务商接口
export interface ModelProvider {
  name: string;
  type: 'deepseek' | 'zhipu' | 'kimi' | 'custom';

  // 核心方法
  getModels(apiKey: string, customConfig?: CustomProviderConfig): Promise<ModelInfo[]>;
  validateApiKey(apiKey: string, customConfig?: CustomProviderConfig): Promise<boolean>;
  getRecommendedModel(useCase: 'search' | 'relation' | 'reminder' | 'general'): ModelInfo | null;
}

// 扩展的服务商接口，包含测试功能
export interface ModelProviderWithTest extends ModelProvider {
  testConnection(apiKey: string, customConfig?: CustomProviderConfig): Promise<TestResult>;
}