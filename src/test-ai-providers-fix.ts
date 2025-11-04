/**
 * AI提供商修复测试脚本
 * 用于测试AI提供商初始化修复功能
 */

import { fixAIProviders } from './utils/fix-ai-providers';

// 运行修复脚本
console.log('开始测试AI提供商修复功能...');

fixAIProviders()
  .then(() => {
    console.log('✅ AI提供商修复测试完成');
  })
  .catch((error) => {
    console.error('❌ AI提供商修复测试失败:', error);
  });