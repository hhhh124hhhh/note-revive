/**
 * 增强版AI设置组件
 * 集成多提供商配置和动态模型选择
 */

import { useState, useEffect } from 'react';
import { aiSettingsService } from '../services/ai/index';
import { DbAIProvider } from '../db';
import { CustomProviderConfig, ModelInfo } from '../services/ai/types';
import { ProviderConfig } from './ai/ProviderConfig';

// AI 功能环境变量检测函数
const isAIEnabled = (): boolean => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_AI_ENABLED !== 'false';
  }
  return true; // 默认启用，用于向后兼容
};

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
  const [activeTab, setActiveTab] = useState<'providers' | 'models' | 'usage' | 'features'>('providers');
  const [isAIAvailable, setIsAIAvailable] = useState<boolean | null>(null);
  const [selectedModels, setSelectedModels] = useState<Record<number, string>>({});
  const [availableModels, setAvailableModels] = useState<Record<number, ModelInfo[]>>({});
  const [expandedProviders, setExpandedProviders] = useState<Record<number, boolean>>({});
  const [setupWizardProvider, setSetupWizardProvider] = useState<DbAIProvider | null>(null);
  const [providerFilter, setProviderFilter] = useState<'all' | 'builtin' | 'custom'>('all');

  // 检查 AI 功能可用性
  useEffect(() => {
    const checkAIAvailability = () => {
      const enabled = isAIEnabled();
      setIsAIAvailable(enabled);
      console.log(`EnhancedAISettings: AI 功能可用性: ${enabled ? '启用' : '禁用'}`);
    };

    checkAIAvailability();
  }, []);

  // 添加一个useEffect来在组件挂载时加载提供商数据（如果AI功能可用）
  useEffect(() => {
    if (isAIAvailable === true) {
      loadProviders();
    }
  }, [isAIAvailable]);

  // 如果 AI 功能被禁用，显示提示信息
  if (isAIAvailable === false) {
    return (
      <div className="text-center py-12">
        <div className="animate-pulse">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">AI 功能已禁用</h3>
        <p className="text-gray-500 mb-4">
          当前环境中 AI 功能已被禁用，因此无法访问 AI 设置界面。
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-md mx-auto">
          <h4 className="text-sm font-medium text-gray-800 mb-2">启用方法</h4>
          <p className="text-xs text-gray-600">
            请设置环境变量 <code className="bg-gray-100 px-1 py-0.5 rounded">VITE_AI_ENABLED=true</code>
          </p>
          <p className="text-xs text-gray-600 mt-1">
            然后重启开发服务器即可使用 AI 功能
          </p>
        </div>
      </div>
    );
  }

  const loadProviders = async () => {
    try {
      setIsLoading(true);
      console.log('正在加载AI提供商...');

      // AI服务应该已经在App.tsx中初始化过了，直接获取设置
      const settings = await aiSettingsService.getSettings();
      console.log('成功加载AI提供商:', settings.providers);
      setProviders(settings.providers);
    } catch (error) {
      console.error('加载AI提供商失败:', error);
      console.error('错误详情:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });

      // 如果还没有初始化，尝试初始化一次
      try {
        console.log('尝试初始化AI设置服务...');
        await aiSettingsService.initialize();
        const settings = await aiSettingsService.getSettings();
        console.log('初始化后成功加载AI提供商:', settings.providers);
        setProviders(settings.providers);
      } catch (initError) {
        console.error('初始化AI设置服务也失败:', initError);

        // 不再使用 alert，而是显示友好的错误信息
        setProviders([]);

        // 可以考虑显示一个错误提示组件，而不是 alert
        console.warn('AI 设置服务初始化失败，这可能是由于 AI 功能被禁用或配置错误');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 添加手动刷新提供商列表的函数
  const refreshProviders = async () => {
    try {
      console.log('手动刷新AI提供商列表...');
      // 重新初始化默认提供商
      const { initDefaultAIProviders } = await import('../db');
      await initDefaultAIProviders();
      
      // 重新加载提供商列表
      await loadProviders();
      
      console.log('✅ AI提供商列表刷新完成');
    } catch (error) {
      console.error('❌ 刷新AI提供商列表失败:', error);
      alert('刷新AI提供商列表失败，请查看控制台了解详细信息');
    }
  };

  const handleProviderUpdate = (updatedProvider: DbAIProvider) => {
    setProviders(prev =>
      prev.map(p => p.id === updatedProvider.id ? updatedProvider : p)
    );
    
    // 更新选中的模型状态
    if (updatedProvider.selectedModel) {
      setSelectedModels(prev => ({
        ...prev,
        [updatedProvider.id!]: updatedProvider.selectedModel!
      }));
    }
  };

  const handleModelSelect = (providerId: number, modelId: string) => {
    setSelectedModels(prev => ({
      ...prev,
      [providerId]: modelId
    }));
    
    // 更新提供商的选中模型
    setProviders(prev => prev.map(provider => {
      if (provider.id === providerId) {
        return { ...provider, selectedModel: modelId };
      }
      return provider;
    }));
  };

  // 添加一个函数来获取提供商类型对应的图标
  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'deepseek':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        );
      case 'zhipu':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        );
      case 'kimi':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        );
    }
  };

  // 添加一个函数来获取提供商的状态颜色
  const getProviderStatusColor = (provider: DbAIProvider) => {
    if (!provider.enabled) return 'bg-gray-100 text-gray-800';
    switch (provider.testStatus) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 添加一个函数来获取提供商的状态文本
  const getProviderStatusText = (provider: DbAIProvider) => {
    if (!provider.enabled) return '已禁用';
    switch (provider.testStatus) {
      case 'success':
        return '连接正常';
      case 'failed':
        return '连接失败';
      case 'pending':
        return '测试中...';
      default:
        return '未测试';
    }
  };

  const handleTestResult = (result: any) => {
    // 显示测试结果通知
    if (result.success) {
      // 测试成功，自动弹窗显示可选择的模型已在ProviderConfig中处理
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

  const loadProviderModels = async (providerId: number) => {
    try {
      const modelList = await aiSettingsService.getProviderModels(providerId);
      setAvailableModels(prev => ({
        ...prev,
        [providerId]: modelList
      }));
      return modelList;
    } catch (error) {
      console.error('加载模型列表失败:', error);
      return [];
    }
  };

  // 启动设置向导
  const startSetupWizard = (provider: DbAIProvider) => {
    setSetupWizardProvider(provider);
    // 自动展开提供商配置
    setExpandedProviders(prev => ({
      ...prev,
      [provider.id!]: true
    }));
  };

  // 完成设置向导
  const completeSetupWizard = () => {
    setSetupWizardProvider(null);
    // 重新加载提供商列表以反映更改
    loadProviders();
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
            onClick={refreshProviders}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            刷新提供商
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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

      {/* 设置向导提示 */}
      {setupWizardProvider && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 mt-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-blue-900">AI设置向导</h3>
              <p className="text-sm text-blue-700 mt-1">
                正在为 {setupWizardProvider.name} 配置AI服务。请按照以下步骤操作：
              </p>
              <ol className="list-decimal list-inside text-sm text-blue-700 mt-2 space-y-1">
                <li>编辑配置并输入API密钥</li>
                <li>点击"测试连接"验证配置</li>
                <li>从弹出的模型列表中选择合适的模型</li>
                <li>点击"确认选择"完成配置</li>
              </ol>
              <button
                onClick={completeSetupWizard}
                className="mt-3 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                完成向导
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 标签页 */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('providers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'providers'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            提供商配置
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'models'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            模型选择
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'usage'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            使用统计
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'features'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            功能设置
          </button>
        </nav>
      </div>

      {/* 提供商配置标签页 */}
      {activeTab === 'providers' && (
        <div className="space-y-6">
          {/* 所有提供商 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">AI提供商</h3>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-500">
                  共 {providers.length} 个提供商
                </div>
                <button
                  onClick={() => setShowAddProvider(!showAddProvider)}
                  className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm"
                >
                  添加提供商
                </button>
              </div>
            </div>
            
            {/* 提供商分类标签 */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setProviderFilter('all')}
                className={`px-3 py-1 text-sm rounded-full ${providerFilter === 'all' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                全部 ({providers.length})
              </button>
              <button
                onClick={() => setProviderFilter('builtin')}
                className={`px-3 py-1 text-sm rounded-full ${providerFilter === 'builtin' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                内置 ({providers.filter(p => p.type !== 'custom').length})
              </button>
              <button
                onClick={() => setProviderFilter('custom')}
                className={`px-3 py-1 text-sm rounded-full ${providerFilter === 'custom' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                自定义 ({providers.filter(p => p.type === 'custom').length})
              </button>
            </div>
            
            <div className="space-y-4">
              {providers
                .filter(p => {
                  if (providerFilter === 'builtin') return p.type !== 'custom';
                  if (providerFilter === 'custom') return p.type === 'custom';
                  return true;
                })
                .map(provider => (
                  <div 
                    key={provider.id} 
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-primary-600">
                          {getProviderIcon(provider.type)}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 flex items-center gap-2">
                            {provider.name}
                            {provider.type === 'custom' && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                                自定义
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${getProviderStatusColor(provider)}`}>
                              {getProviderStatusText(provider)}
                            </span>
                            {provider.selectedModel && (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                已选择模型
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!provider.apiKey && (
                          <button
                            onClick={() => startSetupWizard(provider)}
                            className="text-sm text-primary-600 hover:text-primary-800"
                          >
                            设置向导
                          </button>
                        )}
                        <button
                          onClick={() => {
                            // 切换提供商展开状态
                            setExpandedProviders(prev => ({
                              ...prev,
                              [provider.id!]: !prev[provider.id!]
                            }));
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg 
                            className={`w-5 h-5 transition-transform ${expandedProviders[provider.id!] ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {expandedProviders[provider.id!] && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <ProviderConfig
                          provider={provider}
                          onUpdate={handleProviderUpdate}
                          onTest={handleTestResult}
                          onModelSelect={(modelId) => handleModelSelect(provider.id!, modelId)}
                          selectedModel={selectedModels[provider.id!] || provider.selectedModel}
                        />
                      </div>
                    )}
                  </div>
                ))}
            </div>
            
            {providers.filter(p => {
              if (providerFilter === 'builtin') return p.type !== 'custom';
              if (providerFilter === 'custom') return p.type === 'custom';
              return true;
            }).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>{providerFilter === 'custom' ? '暂无自定义提供商' : '暂无提供商'}</p>
                <p className="text-sm mt-2">{providerFilter === 'custom' ? '点击上方按钮添加自定义提供商' : '请刷新提供商列表'}</p>
              </div>
            )}
            
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
      
      {/* 功能设置标签页 */}
      {activeTab === 'features' && (
        <div>
          <p className="text-gray-600 mb-4">
            配置AI功能的各项设置和偏好
          </p>
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">AI功能设置</h3>
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h4 className="font-medium">智能搜索</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
                  </label>
                </div>
                <p className="text-sm text-gray-500">使用AI技术理解笔记内容，提供更精准的搜索结果</p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-100 rounded-full">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className="font-medium">内容生成</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
                  </label>
                </div>
                <p className="text-sm text-gray-500">根据指令生成笔记内容、大纲或扩展现有内容</p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </div>
                    <h4 className="font-medium">写作助手</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
                  </label>
                </div>
                <p className="text-sm text-gray-500">提供语法检查、措辞优化和内容润色功能</p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-100 rounded-full">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h4 className="font-medium">智能分类</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
                  </label>
                </div>
                <p className="text-sm text-gray-500">自动分析笔记内容并推荐合适的分类和标签</p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-100 rounded-full">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h4 className="font-medium">隐私设置</h4>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-2">选择是否将笔记内容发送至AI服务提供商</p>
                <select className="w-full p-2 border border-gray-300 rounded-md text-sm">
                  <option value="normal">正常处理（推荐）</option>
                  <option value="anonymous">匿名处理</option>
                  <option value="none">仅本地处理</option>
                </select>
              </div>
              
              <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-blue-800">实验性功能说明</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      这些功能仍处于实验阶段，可能会有不稳定情况。我们不会永久存储您的笔记内容用于AI训练。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 模型比较内容组件
function ModelComparisonContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [providers, setProviders] = useState<DbAIProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<number | ''>('');
  const [selectedModel, setSelectedModel] = useState<string>('');

  const loadAllModels = async () => {
    setIsLoading(true);
    try {
      // 获取所有提供商
      const settings = await aiSettingsService.getSettings();
      setProviders(settings.providers);
      
      // 获取所有模型
      const allModels = await aiSettingsService.getUsageStats();
      if (allModels.allModels) {
        setModels(allModels.allModels.flatMap(providerModels => providerModels.models));
      }
    } catch (error) {
      console.error('加载模型失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllModels();
  }, []);

  const handleProviderChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const providerId = e.target.value ? parseInt(e.target.value) : '';
    setSelectedProvider(providerId);
    
    if (providerId) {
      try {
        // 加载选定提供商的模型
        const providerModels = await aiSettingsService.getProviderModels(providerId);
        setModels(providerModels);
      } catch (error) {
        console.error('加载提供商模型失败:', error);
      }
    } else {
      // 如果没有选择提供商，加载所有模型
      loadAllModels();
    }
  };

  const handleModelSelect = async (model: ModelInfo) => {
    setSelectedModel(model.id);
    
    // 这里可以添加选择模型后的逻辑
    console.log('选择模型:', model);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 提供商选择下拉框 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择提供商
        </label>
        <select
          value={selectedProvider}
          onChange={handleProviderChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">所有提供商</option>
          {providers.map(provider => (
            <option key={provider.id} value={provider.id}>
              {provider.name} ({provider.type})
            </option>
          ))}
        </select>
      </div>

      {/* 模型列表 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">可用模型</h3>
        
        {models.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {models.map(model => (
              <div 
                key={model.id} 
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedModel === model.id 
                    ? 'border-primary-500 bg-primary-50 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
                onClick={() => handleModelSelect(model)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{model.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                        {model.provider}
                      </span>
                      {model.recommended && (
                        <span className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">
                          推荐
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedModel === model.id && (
                    <div className="text-primary-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 00-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>暂无可用模型</p>
            <p className="text-sm mt-2">请先在提供商配置中设置API密钥并测试连接</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 使用统计内容组件
function UsageStatsContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [usageStats, setUsageStats] = useState<any[]>([]);

  const loadUsageStats = async () => {
    setIsLoading(true);
    try {
      // 获取使用统计
      const stats = await aiSettingsService.getUsageStats();
      // getCacheStats() 返回的是对象，包含 entries 数组
      setUsageStats(stats.stats?.entries || []);
    } catch (error) {
      console.error('加载使用统计失败:', error);
      setUsageStats([]); // 确保总是数组
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsageStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // 计算统计数据（基于缓存统计）
  const totalModels = usageStats.reduce((sum, stat) => sum + (stat.modelCount || 0), 0);
  const totalEntries = usageStats.length;
  const expiredEntries = usageStats.filter(stat => stat.isExpired).length;
  const avgCacheAge = usageStats.length > 0
    ? Math.round(usageStats.reduce((sum, stat) => sum + (stat.cacheAge || 0), 0) / usageStats.length / 1000 / 60) // 转换为分钟
    : 0;

  return (
    <div className="space-y-6">
      {/* 缓存统计标题和刷新按钮 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">缓存统计</h3>
          <button
            onClick={loadUsageStats}
            disabled={isLoading}
            className="px-3 py-1 text-sm rounded bg-primary-100 text-primary-700 hover:bg-primary-200 disabled:opacity-50"
          >
            {isLoading ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>

      {/* 统计概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">缓存条目</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalEntries}
              </p>
            </div>
            <div className="bg-blue-100 p-2 rounded">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">模型总数</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalModels.toLocaleString()}
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
              <p className="text-sm text-gray-500">过期条目</p>
              <p className="text-2xl font-bold text-gray-900">
                {expiredEntries}
              </p>
            </div>
            <div className="bg-yellow-100 p-2 rounded">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均缓存时间</p>
              <p className="text-2xl font-bold text-gray-900">
                {avgCacheAge}分钟
              </p>
            </div>
            <div className="bg-purple-100 p-2 rounded">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 详细统计表格 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">详细缓存信息</h3>
        
        {usageStats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    提供商
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    模型数量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    缓存时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usageStats.map((stat, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stat.provider || '未知提供商'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.modelCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Math.round((stat.cacheAge || 0) / 1000 / 60)} 分钟前
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        stat.isExpired
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {stat.isExpired ? '已过期' : '有效'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p>暂无使用数据</p>
            <p className="text-sm mt-2">开始使用AI功能后，这里将显示详细的使用统计</p>
          </div>
        )}
      </div>
    </div>
  );
}