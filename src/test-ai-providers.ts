/**
 * AI服务商功能测试脚本
 * 用于验证所有提供商的模型拉取功能
 */

import { ModelManager } from './services/ai/ModelManager';
import { DeepSeekProvider } from './services/ai/providers/DeepSeekProvider';
import { ZhipuProvider } from './services/ai/providers/ZhipuProvider';
import { KimiProvider } from './services/ai/providers/KimiProvider';
import { CustomProvider } from './services/ai/providers/CustomProvider';
import { ModelCacheManager } from './services/ai/ModelCacheManager';

// 测试配置（实际使用时需要真实的API密钥）
const TEST_CREDENTIALS = {
  deepSeek: 'sk-test-deepseek-key',
  zhipu: 'test-zhipu-key',
  kimi: 'sk-test-kimi-key',
  custom: {
    'OpenAI': 'sk-test-openai-key',
    'Claude': 'sk-test-claude-key'
  }
};

/**
 * 测试提供商模型拉取功能
 */
async function testProviderModels() {
  console.log('🚀 开始测试AI服务商模型拉取功能...\n');

  const cacheManager = new ModelCacheManager();
  const modelManager = new ModelManager();

  // 测试DeepSeek提供商
  console.log('📋 测试 DeepSeek 提供商...');
  try {
    const deepSeekProvider = new DeepSeekProvider(cacheManager);
    const models = await deepSeekProvider.getModels(TEST_CREDENTIALS.deepSeek);
    console.log(`✅ DeepSeek 成功获取 ${models.length} 个模型`);
    models.forEach(model => {
      console.log(`   - ${model.name} (${model.id})`);
      console.log(`     描述: ${model.description}`);
      console.log(`     最大Token: ${model.maxTokens}`);
      console.log(`     价格: $${model.pricing.input}/1K输入, $${model.pricing.output}/1K输出`);
      console.log(`     能力: ${model.capabilities.join(', ')}`);
      console.log('');
    });
  } catch (error) {
    console.log(`❌ DeepSeek 测试失败:`, error instanceof Error ? error.message : error);
  }

  // 测试智谱AI提供商
  console.log('📋 测试 智谱AI 提供商...');
  try {
    const zhipuProvider = new ZhipuProvider(cacheManager);
    const models = await zhipuProvider.getModels(TEST_CREDENTIALS.zhipu);
    console.log(`✅ 智谱AI 成功获取 ${models.length} 个模型`);
    models.forEach(model => {
      console.log(`   - ${model.name} (${model.id})`);
      console.log(`     描述: ${model.description}`);
      console.log(`     最大Token: ${model.maxTokens}`);
      console.log(`     价格: ¥${model.pricing.input}/1K输入, ¥${model.pricing.output}/1K输出`);
      console.log(`     能力: ${model.capabilities.join(', ')}`);
      console.log('');
    });
  } catch (error) {
    console.log(`❌ 智谱AI 测试失败:`, error instanceof Error ? error.message : error);
  }

  // 测试Kimi提供商
  console.log('📋 测试 Kimi 提供商...');
  try {
    const kimiProvider = new KimiProvider(cacheManager);
    const models = await kimiProvider.getModels(TEST_CREDENTIALS.kimi);
    console.log(`✅ Kimi 成功获取 ${models.length} 个模型`);
    models.forEach(model => {
      console.log(`   - ${model.name} (${model.id})`);
      console.log(`     描述: ${model.description}`);
      console.log(`     最大Token: ${model.maxTokens}`);
      console.log(`     价格: ¥${model.pricing.input}/1K输入, ¥${model.pricing.output}/1K输出`);
      console.log(`     能力: ${model.capabilities.join(', ')}`);
      console.log('');
    });
  } catch (error) {
    console.log(`❌ Kimi 测试失败:`, error instanceof Error ? error.message : error);
  }

  // 测试自定义OpenAI提供商
  console.log('📋 测试 自定义 OpenAI 提供商...');
  try {
    const openAIConfig = {
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com',
      apiType: 'openai' as const,
      headers: {}
    };
    const openAIProvider = new CustomProvider(cacheManager, openAIConfig);
    const models = await openAIProvider.getModels(TEST_CREDENTIALS.custom['OpenAI']);
    console.log(`✅ OpenAI 成功获取 ${models.length} 个模型`);
    models.forEach(model => {
      console.log(`   - ${model.name} (${model.id})`);
      console.log(`     描述: ${model.description}`);
      console.log(`     最大Token: ${model.maxTokens}`);
      console.log(`     价格: $${model.pricing.input}/1K输入, $${model.pricing.output}/1K输出`);
      console.log(`     能力: ${model.capabilities.join(', ')}`);
      console.log('');
    });
  } catch (error) {
    console.log(`❌ OpenAI 测试失败:`, error instanceof Error ? error.message : error);
  }

  // 测试自定义Claude提供商
  console.log('📋 测试 自定义 Claude 提供商...');
  try {
    const claudeConfig = {
      name: 'Claude',
      baseUrl: 'https://api.anthropic.com',
      apiType: 'claude' as const,
      headers: {}
    };
    const claudeProvider = new CustomProvider(cacheManager, claudeConfig);
    const models = await claudeProvider.getModels(TEST_CREDENTIALS.custom['Claude']);
    console.log(`✅ Claude 成功获取 ${models.length} 个模型`);
    models.forEach(model => {
      console.log(`   - ${model.name} (${model.id})`);
      console.log(`     描述: ${model.description}`);
      console.log(`     最大Token: ${model.maxTokens}`);
      console.log(`     价格: $${model.pricing.input}/1K输入, $${model.pricing.output}/1K输出`);
      console.log(`     能力: ${model.capabilities.join(', ')}`);
      console.log('');
    });
  } catch (error) {
    console.log(`❌ Claude 测试失败:`, error instanceof Error ? error.message : error);
  }
}

/**
 * 测试模型推荐功能
 */
async function testModelRecommendations() {
  console.log('🎯 测试模型推荐功能...\n');

  const cacheManager = new ModelCacheManager();
  const providers = [
    new DeepSeekProvider(cacheManager),
    new ZhipuProvider(cacheManager),
    new KimiProvider(cacheManager)
  ];

  const useCases = ['search', 'relation', 'reminder', 'general'] as const;

  for (const useCase of useCases) {
    console.log(`📝 用例: ${useCase}`);
    for (const provider of providers) {
      const recommended = provider.getRecommendedModel(useCase);
      if (recommended) {
        console.log(`   ${provider.name} 推荐: ${recommended.name} (${recommended.id})`);
      }
    }
    console.log('');
  }
}

/**
 * 测试缓存功能
 */
async function testCacheFunctionality() {
  console.log('💾 测试缓存功能...\n');

  const cacheManager = new ModelCacheManager();
  const testApiKey = 'test-key';

  // 测试缓存设置和获取
  const testModels = [
    {
      id: 'test-model-1',
      name: 'Test Model 1',
      description: 'A test model',
      maxTokens: 4096,
      pricing: { input: 0.001, output: 0.002, currency: 'USD' },
      capabilities: ['test'],
      recommended: false,
      provider: 'Test'
    }
  ];

  // 设置缓存
  cacheManager.cacheModels('test-provider', testApiKey, testModels);
  console.log('✅ 缓存设置成功');

  // 获取缓存
  const cachedModels = cacheManager.getCachedModels('test-provider', testApiKey);
  if (cachedModels && cachedModels.length > 0) {
    console.log(`✅ 缓存获取成功，找到 ${cachedModels.length} 个模型`);
    console.log(`   模型名称: ${cachedModels[0].name}`);
  } else {
    console.log('❌ 缓存获取失败');
  }

  // 测试缓存统计
  const stats = cacheManager.getCacheStats();
  console.log(`✅ 缓存统计: ${stats.totalEntries} 个条目`);

  // 清理测试缓存
  cacheManager.clearProviderCache('test-provider');
  console.log('✅ 测试缓存清理完成');
}

/**
 * 主测试函数
 */
export async function runAIProviderTests() {
  console.log('🧪 AI服务商功能测试开始\n');
  console.log('=' .repeat(50));

  try {
    await testProviderModels();
    console.log('=' .repeat(50));

    await testModelRecommendations();
    console.log('=' .repeat(50));

    await testCacheFunctionality();

    console.log('=' .repeat(50));
    console.log('🎉 所有测试完成！');

  } catch (error) {
    console.error('💥 测试过程中发生错误:', error);
  }
}

// 如果直接运行此文件，执行测试
if (typeof window === 'undefined') {
  // Node.js 环境
  runAIProviderTests().catch(console.error);
}