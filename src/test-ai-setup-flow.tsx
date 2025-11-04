/**
 * AI设置流程测试组件
 * 用于测试优化后的AI设置向导流程
 */

import { useState } from 'react';
import { EnhancedAISettings } from './components/EnhancedAISettings';

export function TestAISetupFlow() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">AI设置流程测试</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">测试说明</h2>
        <p className="text-gray-700 mb-4">
          本测试用于验证优化后的AI设置向导流程，包括以下步骤：
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
          <li>选择模型</li>
          <li>启用提供商</li>
          <li>编辑配置并输入API密钥</li>
          <li>测试连接</li>
          <li>自动弹窗显示可选择的模型</li>
          <li>用户选择后结束</li>
        </ol>
        
        <button
          onClick={() => setShowSettings(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          开始测试
        </button>
      </div>
      
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <EnhancedAISettings onClose={() => setShowSettings(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default TestAISetupFlow;