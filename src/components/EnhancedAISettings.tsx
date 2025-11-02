/**
 * 增强版AI设置组件
 * 集成多提供商配置和动态模型选择
 */

import { useState, useEffect } from 'react';
import { aiSettingsService } from '../services/ai/index';
import { DbAIProvider } from '../db';
import { CustomProviderConfig } from '../services/ai/types';
import { ProviderConfig } from './ai/ProviderConfig';

interface EnhancedAISettingsProps {
  onClose?: () => void;
}

export function EnhancedAISettings({ onClose }: EnhancedAISettingsProps) {
  const [providers, setProviders] = useState<DbAIProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [customProviderForm, setCustomProviderForm] = useState<CustomProviderConfig>({
    name: '',
    baseUrl: '',
    apiType: 'openai',
    headers: {}
  });
  const [customApiKey, setCustomApiKey] = useState('');
  const [activeTab, setActiveTab] = useState<'providers' | 'models' | 'usage'>('providers');
  
  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setIsLoading(true);
      console.log('正在加载AI提供商...');

      // 确保AI服务已初始化
      await aiSettingsService.initialize();

      const settings = await aiSettingsService.getSettings();
      console.log('成功加载AI提供商:', settings.providers);
      setProviders(settings.providers);
    } catch (error) {
      console.error('加载AI提供商失败:', error);
      // 显示错误信息给用户
      alert('加载AI提供商失败，请刷新页面重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderUpdate = (updatedProvider: DbAIProvider) => {
    setProviders(prev =>
      prev.map(p => p.id === updatedProvider.id ? updatedProvider : p)
    );
  };

  const handleTestResult = (result: any) => {
    // 显示测试结果通知
    if (result.success) {
      alert(`连接成功: ${result.message}`);
    } else {
      alert(`连接失败: ${result.message}`);
    }
  };

  const handleAddCustomProvider = async () => {
    if (!customProviderForm.name.trim() || !customProviderForm.baseUrl.trim()) {
      alert('请填写完整的提供商信息');
      return;
    }

    try {
      await aiSettingsService.addCustomProvider(customProviderForm, customApiKey);
      setShowAddProvider(false);
      setCustomProviderForm({
        name: '',
        baseUrl: '',
        apiType: 'openai',
        headers: {}
      });
      setCustomApiKey('');
      await loadProviders();
    } catch (error) {
      console.error('添加自定义提供商失败:', error);
      alert('添加失败，请检查配置信息');
    }
  };

  const handleDeleteProvider = async (providerId: number) => {
    const confirmed = window.confirm('删除后将无法恢复，是否继续？');

    if (confirmed) {
      try {
        await aiSettingsService.removeProvider(providerId);
        await loadProviders();
      } catch (error) {
        console.error('删除提供商失败:', error);
        alert('删除失败');
      }
    }
  };

  const handleTestAllProviders = async () => {
    try {
      const results = await aiSettingsService.testAllEnabledProviders();
      console.log('批量测试结果:', results);
      alert(`测试完成，共测试 ${results.length} 个提供商`);
    } catch (error) {
      console.error('批量测试失败:', error);
      alert('批量测试失败');
    }
  };

  const enabledProviders = providers.filter(p => p.enabled);
  const selectedProvider = providers.find(p => p.selectedModel);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI设置</h2>
          <p className="text-gray-600 mt-1">
            配置AI服务提供商和模型选择
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTestAllProviders}
            disabled={enabledProviders.length === 0}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            测试所有连接
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              完成
            </button>
          )}
        </div>
      </div>

      {/* 状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已启用提供商</p>
              <p className="text-2xl font-bold text-gray-900">{enabledProviders.length}</p>
            </div>
            <div className="bg-blue-100 p-2 rounded">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">当前模型</p>
              <p className="text-lg font-bold text-gray-900 truncate">
                {selectedProvider?.selectedModel || '未选择'}
              </p>
            </div>
            <div className="bg-green-100 p-2 rounded">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">连接状态</p>
              <p className="text-lg font-bold text-gray-900">
                {providers.filter(p => p.enabled && p.testStatus === 'success').length} 正常
              </p>
            </div>
            <div className="bg-yellow-100 p-2 rounded">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('providers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'providers'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            提供商配置
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'models'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            模型选择
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'usage'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            使用统计
          </button>
        </nav>
      </div>

      {/* 提供商配置标签页 */}
      {activeTab === 'providers' && (
        <div className="space-y-6">
          {/* 内置提供商 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">内置提供商</h3>
            <div className="space-y-4">
              {providers
                .filter(p => p.type !== 'custom')
                .map(provider => (
                  <ProviderConfig
                    key={provider.id}
                    provider={provider}
                    onUpdate={handleProviderUpdate}
                    onTest={handleTestResult}
                  />
                ))}
            </div>
          </div>

          {/* 自定义提供商 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">自定义提供商</h3>
              <button
                onClick={() => setShowAddProvider(!showAddProvider)}
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                添加提供商
              </button>
            </div>

            {/* 添加自定义提供商表单 */}
            {showAddProvider && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      提供商名称
                    </label>
                    <input
                      type="text"
                      value={customProviderForm.name}
                      onChange={(e) => setCustomProviderForm(prev => ({
                        ...prev,
                        name: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="例如：OpenAI"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API基础URL
                    </label>
                    <input
                      type="url"
                      value={customProviderForm.baseUrl}
                      onChange={(e) => setCustomProviderForm(prev => ({
                        ...prev,
                        baseUrl: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="https://api.openai.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API类型
                    </label>
                    <select
                      value={customProviderForm.apiType}
                      onChange={(e) => setCustomProviderForm(prev => ({
                        ...prev,
                        apiType: e.target.value as 'openai' | 'claude'
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="openai">OpenAI 兼容</option>
                      <option value="claude">Claude 兼容</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API密钥
                    </label>
                    <input
                      type="password"
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="输入API密钥"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-4">
                  <button
                    onClick={() => {
                      setShowAddProvider(false);
                      setCustomProviderForm({
                        name: '',
                        baseUrl: '',
                        apiType: 'openai',
                        headers: {}
                      });
                      setCustomApiKey('');
                    }}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddCustomProvider}
                    className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                  >
                    添加
                  </button>
                </div>
              </div>
            )}

            {/* 自定义提供商列表 */}
            <div className="space-y-4">
              {providers
                .filter(p => p.type === 'custom')
                .map(provider => (
                  <div key={provider.id} className="relative">
                    <ProviderConfig
                      provider={provider}
                      onUpdate={handleProviderUpdate}
                      onTest={handleTestResult}
                    />
                    <button
                      onClick={() => handleDeleteProvider(provider.id!)}
                      className="absolute top-4 right-4 p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 模型选择标签页 */}
      {activeTab === 'models' && (
        <div>
          <p className="text-gray-600 mb-4">
            查看和管理所有可用的AI模型
          </p>
          <ModelComparisonContent />
        </div>
      )}

      {/* 使用统计标签页 */}
      {activeTab === 'usage' && (
        <div>
          <p className="text-gray-600 mb-4">
            查看AI服务的使用统计和成本分析
          </p>
          <UsageStatsContent />
        </div>
      )}
    </div>
  );
}

// 模型比较内容组件
function ModelComparisonContent() {
  const [isLoading, setIsLoading] = useState(false);

  const loadAllModels = async () => {
    setIsLoading(true);
    try {
      const settings = await aiSettingsService.getSettings();
      // 这里应该加载所有模型，为了演示暂时使用空数组
      console.log('加载模型设置:', settings);
    } catch (error) {
      console.error('加载模型失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllModels();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="text-center py-8 text-gray-500">
      <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p>请先在提供商配置中设置API密钥并测试连接</p>
      <p className="text-sm mt-2">成功连接后，这里将显示所有可用的模型</p>
    </div>
  );
}

// 使用统计内容组件
function UsageStatsContent() {
  return (
    <div className="text-center py-8 text-gray-500">
      <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p>暂无使用数据</p>
      <p className="text-sm mt-2">开始使用AI功能后，这里将显示详细的使用统计</p>
    </div>
  );
}