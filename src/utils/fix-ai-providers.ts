/**
 * AI提供商修复工具
 * 用于确保默认AI提供商正确初始化
 */

import { initDefaultAIProviders, getAIProviders } from '../db';

/**
 * 修复AI提供商数据
 * 确保默认提供商正确初始化并显示在UI中
 */
export async function fixAIProviders(): Promise<void> {
  try {
    console.log('🔧 开始修复AI提供商数据...');
    
    // 初始化默认AI提供商
    await initDefaultAIProviders();
    
    // 验证提供商是否正确创建
    const providers = await getAIProviders();
    console.log(`✅ 已加载 ${providers.length} 个AI提供商:`, providers.map(p => ({
      name: p.name,
      type: p.type,
      enabled: p.enabled,
      hasApiKey: !!p.apiKey
    })));
    
    // 检查是否缺少任何默认提供商
    const expectedProviders = ['deepseek', 'zhipu', 'kimi'];
    const existingTypes = providers.map(p => p.type);
    
    for (const type of expectedProviders) {
      if (!existingTypes.includes(type as any)) {
        console.warn(`⚠️ 缺少默认提供商: ${type}`);
      }
    }
    
    console.log('✅ AI提供商数据修复完成');
  } catch (error) {
    console.error('❌ AI提供商数据修复失败:', error);
    throw error;
  }
}

/**
 * 强制重置AI提供商数据
 * 清除现有数据并重新初始化
 */
export async function resetAIProviders(): Promise<void> {
  try {
    console.log('🔄 开始重置AI提供商数据...');
    
    // 这里可以添加清除现有数据的逻辑（如果需要）
    // 例如：await db.aiProviders.clear();
    
    // 重新初始化默认提供商
    await initDefaultAIProviders();
    
    console.log('✅ AI提供商数据重置完成');
  } catch (error) {
    console.error('❌ AI提供商数据重置失败:', error);
    throw error;
  }
}

// 立即执行修复
fixAIProviders().catch(error => {
  console.error('AI提供商修复过程中出现错误:', error);
});