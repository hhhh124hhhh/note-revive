/**
 * AI服务商和模型相关的类型定义
 */

// 定价信息
export interface PricingInfo {
  input: number;    // 输入价格 (每1K tokens)
  output: number;   // 输出价格 (每1K tokens)
  currency: string; // 货币单位
}

// 模型信息
export interface ModelInfo {
  id: string;           // 模型ID
  name: string;         // 显示名称
  description: string;   // 模型描述
  maxTokens: number;     // 最大token数
  pricing: PricingInfo;  // 定价信息
  capabilities: string[]; // 能力标签
  recommended: boolean;  // 是否推荐
  provider: string;      // 服务商
}

// 自定义服务商配置
export interface CustomProviderConfig {
  name: string;      // 服务商名称
  baseUrl: string;   // API基础URL
  apiType: 'openai' | 'claude'; // API类型
  defaultModel?: string; // 默认模型
  headers: Record<string, string>; // 请求头
}

// 缓存的模型列表
export interface CachedModelList {
  models: ModelInfo[];
  timestamp: number;   // 缓存时间
  provider: string;     // 服务商类型
}

// API响应结果
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// 测试结果
export interface TestResult {
  success: boolean;
  message: string;
  responseTime: number;
  provider: string;
  preview?: string;
}

// 模型使用场景
export type ModelUseCase = 'search' | 'relation' | 'reminder' | 'general';

// 服务商接口
export interface ModelProvider {
  name: string;
  type: 'deepseek' | 'zhipu' | 'kimi' | 'openai' | 'claude' | 'custom';

  // 核心方法
  getModels(apiKey: string, customConfig?: CustomProviderConfig): Promise<ModelInfo[]>;
  validateApiKey(apiKey: string, customConfig?: CustomProviderConfig): Promise<boolean>;
  getRecommendedModel(useCase: ModelUseCase): ModelInfo | null;
}

// DeepSeek 模型规格
export interface DeepSeekModelSpec {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  pricing: PricingInfo;
  capabilities: string[];
  recommended: boolean;
}

// 智谱AI 模型规格
export interface ZhipuModelSpec {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  pricing: PricingInfo;
  capabilities: string[];
  recommended: boolean;
}

// Kimi 模型规格
export interface KimiModelSpec {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  pricing: PricingInfo;
  capabilities: string[];
  recommended: boolean;
}

// OpenAI 兼容的模型响应
export interface OpenAIModelResponse {
  data: OpenAIModel[];
  object: string;
}

export interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  permission: string[];
  root: string;
  parent: string | null;
}

// Claude 兼容的模型响应
export interface ClaudeModelResponse {
  data: ClaudeModel[];
}

export interface ClaudeModel {
  id: string;
  display_name: string;
  type: string;
  created_at: string;
  updated_at: string;
  active: boolean;
  context_window: number;
}

// 统一的聊天完成请求
export interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

// 统一的聊天完成响应
export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message?: {
      role: string;
      content: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 扩展的AI服务配置
export interface ExtendedDbSettings {
  // 现有字段...
  aiEnabled: boolean;
  aiProvider?: string;
  aiApiKey?: string;
  aiModel?: string;

  // 新增字段
  aiCustomConfig?: string; // JSON字符串，存储自定义服务商配置
  aiSelectedModels?: Record<string, string>; // 每个服务商选择的模型
  aiModelCacheExpiry?: Date; // 模型缓存过期时间
  aiCostLimit?: number; // 月度成本限制
  aiCurrentCost?: number; // 当前月份成本
}

// 模型使用统计
export interface ModelUsageStats {
  provider: string;
  model: string;
  date: Date;
  requests: number;
  tokensUsed: number;
  cost: number;
  averageResponseTime: number;
  successRate: number;
}

// 模型评分信息
export interface ModelScore {
  model: ModelInfo;
  score: number;
  reason: string;
}