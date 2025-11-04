import { useState, useEffect } from 'react';
import { DbAIProvider } from '../../db';
import { ModelInfo, CustomProviderConfig } from '../../services/ai/types';
import { aiSettingsService } from '../../services/ai/index';
import { ModelInfoCard } from './ModelInfoCard';

interface ProviderConfigProps {
  provider: DbAIProvider;
  onUpdate?: (provider: DbAIProvider) => void;
  onTest?: (result: any) => void;
  onModelSelect?: (modelId: string) => void;
  selectedModel?: string;
}

export function ProviderConfig({ provider, onUpdate, onTest, onModelSelect, selectedModel: externalSelectedModel }: ProviderConfigProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [internalSelectedModel, setInternalSelectedModel] = useState<string>('');
  const [customConfig, setCustomConfig] = useState<CustomProviderConfig | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'capabilities' | 'pricing'>('name');
  const [showModelSelectionModal, setShowModelSelectionModal] = useState(false);

  // 重置搜索和排序
  const resetSearch = () => {
    setSearchTerm('');
    setSortBy('name');
  };

  // 获取过滤和排序后的模型列表
  const getFilteredAndSortedModels = () => {
    let filtered = models;

    // 应用搜索过滤
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (model) =>
          model.name.toLowerCase().includes(searchLower) ||
          model.description.toLowerCase().includes(searchLower) ||
          model.provider.toLowerCase().includes(searchLower) ||
          model.capabilities.some((cap) => cap.toLowerCase().includes(searchLower))
      );
    }

    // 应用排序
    switch (sortBy) {
      case 'capabilities':
        return [...filtered].sort((a, b) => {
          // 按功能数量排序
          const aCapCount = a.capabilities.length;
          const bCapCount = b.capabilities.length;
          return bCapCount - aCapCount;
        });
      case 'pricing':
        return [...filtered].sort((a, b) => {
          // 按输入价格排序
          const aPrice = a.pricing?.input || 0;
          const bPrice = b.pricing?.input || 0;
          return aPrice - bPrice;
        });
      case 'name':
      default:
        return [...filtered].sort((a, b) => {
          // 按名称字母排序
          return a.name.localeCompare(b.name);
        });
    }
  };

  // 使用外部传入的selectedModel或内部状态
  const selectedModel = externalSelectedModel !== undefined ? externalSelectedModel : internalSelectedModel;

  useEffect(() => {
    // 初始化表单数据
    if (provider.apiKey) {
      // 这里应该解密API密钥，为了演示暂时使用占位符
      setApiKey('••••••••••••••••');
    }

    if (provider.selectedModel) {
      setInternalSelectedModel(provider.selectedModel);
    }

    if (provider.config && provider.type === 'custom') {
      try {
        setCustomConfig(JSON.parse(provider.config));
      } catch (error) {
        console.error('解析自定义配置失败:', error);
      }
    }
  }, [provider]);

  const handleSave = async () => {
    try {
      const updates: any = {
        selectedModel: selectedModel || undefined
      };

      // 只有当API密钥发生变化时才更新
      if (apiKey !== '••••••••••••••••' && apiKey.trim()) {
        updates.apiKey = apiKey.trim();
      }

      if (provider.type === 'custom' && customConfig) {
        updates.config = customConfig;
      }

      await aiSettingsService.updateProvider(provider.id!, updates);

      setIsEditing(false);
      if (onUpdate) {
        onUpdate({ ...provider, ...updates });
      }
    } catch (error) {
      console.error('保存提供商配置失败:', error);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const result = await aiSettingsService.testProvider(provider.id!);
      if (onTest) {
        onTest(result);
      }

      // 如果测试成功，加载模型列表
      if (result.success && result.models) {
        setModels(result.models);
        setShowModels(true);
        // 自动弹窗显示可选择的模型
        setShowModelSelectionModal(true);
      }
    } catch (error) {
      console.error('测试提供商失败:', error);
      if (onTest) {
        onTest({
          providerId: provider.id,
          success: false,
          message: error instanceof Error ? error.message : '测试失败',
          responseTime: 0
        });
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleLoadModels = async () => {
    // 检查是否有有效的API密钥（已保存的或新输入的）
    const hasValidApiKey = provider.apiKey || (apiKey && apiKey !== '••••••••••••••••');
    if (!hasValidApiKey) {
      alert('请先配置API密钥');
      return;
    }

    setIsLoadingModels(true);
    try {
      const modelList = await aiSettingsService.getProviderModels(provider.id!);
      setModels(modelList);
      setShowModels(true);
    } catch (error) {
      console.error('加载模型列表失败:', error);
      alert('加载模型列表失败，请检查API密钥是否正确');
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleModelSelect = (model: ModelInfo) => {
    setInternalSelectedModel(model.id);
    if (onModelSelect) {
      onModelSelect(model.id);
    }
    setIsEditing(true);
  };

  // 添加一个函数来处理模型选择的变更
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = e.target.value;
    setInternalSelectedModel(modelId);
    if (onModelSelect) {
      onModelSelect(modelId);
    }
  };

  // 添加一个函数来获取提供商的官方链接
  const getProviderLink = () => {
    switch (provider.type) {
      case 'deepseek':
        return 'https://platform.deepseek.com';
      case 'zhipu':
        return 'https://open.bigmodel.cn';
      case 'kimi':
        return 'https://platform.moonshot.cn';
      default:
        return '';
    }
  };

  // 添加一个函数来获取提供商的API密钥说明
  const getApiKeyInstructions = () => {
    switch (provider.type) {
      case 'deepseek':
        return '请访问 DeepSeek 平台获取API密钥';
      case 'zhipu':
        return '请访问智谱AI平台获取API密钥';
      case 'kimi':
        return '请访问 Moonshot 平台获取API密钥';
      default:
        return '请获取API密钥';
    }
  };

  const getStatusColor = () => {
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

  const getStatusText = () => {
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

  // 添加一个函数来获取推荐模型
  const getRecommendedModels = () => {
    // 根据提供商类型返回推荐模型
    switch (provider.type) {
      case 'deepseek':
        return models.filter(model => 
          model.id.includes('deepseek-chat') || 
          model.id.includes('deepseek-coder')
        ).slice(0, 3);
      case 'zhipu':
        return models.filter(model => 
          model.id.includes('GLM') || 
          model.id.includes('glm')
        ).slice(0, 3);
      case 'kimi':
        return models.filter(model => 
          model.id.includes('moonshot')
        ).slice(0, 3);
      default:
        return models.slice(0, 3);
    }
  };

  // 添加一个函数来处理快速模型选择
  const handleQuickModelSelect = (modelId: string) => {
    setInternalSelectedModel(modelId);
    if (onModelSelect) {
      onModelSelect(modelId);
    }
    setIsEditing(true); // 保持编辑状态以便保存
  };

  // 添加一个函数来处理模型选择完成
  const handleModelSelectionComplete = () => {
    setShowModelSelectionModal(false);
    // 保存配置
    handleSave();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          {provider.selectedModel && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              已选择模型
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded hover:bg-primary-200 disabled:opacity-50"
          >
            {isTesting ? '测试中...' : '测试连接'}
          </button>
        </div>
      </div>

      {/* 基本信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            提供商类型
          </label>
          <div className="px-3 py-2 bg-gray-50 rounded text-sm text-gray-900">
            {provider.type === 'custom' ? '自定义' : provider.type.toUpperCase()}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            状态
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                await aiSettingsService.toggleProvider(provider.id!);
                // 通知父组件更新状态
                if (onUpdate) {
                  onUpdate({ ...provider, enabled: !provider.enabled });
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                provider.enabled ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  provider.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-600">
              {provider.enabled ? '已启用' : '已禁用'}
            </span>
          </div>
        </div>
      </div>

      {/* 配置状态指示器 */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <div className="flex items-center gap-2">
          <div className="text-sm">
            <span className="font-medium text-blue-900">配置状态：</span>
            {!provider.apiKey && !isEditing ? (
              <span className="text-blue-700">未配置 - 点击"编辑"按钮开始配置</span>
            ) : isEditing ? (
              <span className="text-blue-700">配置中 - 请输入API密钥并保存</span>
            ) : provider.apiKey && !provider.selectedModel ? (
              <span className="text-blue-700">已配置密钥 - 请加载模型列表并选择模型</span>
            ) : provider.selectedModel ? (
              <span className="text-green-700">配置完成 - 已选择模型</span>
            ) : (
              <span className="text-blue-700">部分配置 - 请完善配置</span>
            )}
          </div>
        </div>
      </div>

      {/* 内置供应商配置提示 */}
      {provider.type !== 'custom' && !provider.apiKey && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="text-sm">
            <span className="font-medium text-yellow-900">配置提示：</span>
            <span className="text-yellow-700">
              {getApiKeyInstructions()}
              {getProviderLink() && (
                <a 
                  href={getProviderLink()} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-yellow-800 underline ml-1"
                >
                  访问官网
                </a>
              )}
            </span>
          </div>
        </div>
      )}

      {/* API密钥配置 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          API密钥
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          disabled={!isEditing}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
          placeholder={isEditing ? "请输入API密钥" : "配置API密钥后显示"}
        />
      </div>

      {/* 自定义配置（仅自定义提供商） */}
      {provider.type === 'custom' && isEditing && (
        <div className="mb-4 p-4 bg-gray-50 rounded">
          <h4 className="text-sm font-medium text-gray-700 mb-2">自定义配置</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API基础URL
              </label>
              <input
                type="url"
                value={customConfig?.baseUrl || ''}
                onChange={(e) => setCustomConfig(prev => prev ? {...prev, baseUrl: e.target.value} : {
                  name: provider.name,
                  baseUrl: e.target.value,
                  apiType: 'openai',
                  headers: {}
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="https://api.example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API类型
              </label>
              <select
                value={customConfig?.apiType || 'openai'}
                onChange={(e) => setCustomConfig(prev => prev ? {...prev, apiType: e.target.value as 'openai' | 'claude'} : {
                  name: provider.name,
                  baseUrl: '',
                  apiType: e.target.value as 'openai' | 'claude',
                  headers: {}
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="openai">OpenAI 兼容</option>
                <option value="claude">Claude 兼容</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 测试结果 */}
      {provider.testMessage && (
        <div className={`mb-4 p-3 rounded ${
          provider.testStatus === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          <div className="text-sm">{provider.testMessage}</div>
          {provider.lastTested && (
            <div className="text-xs mt-1 opacity-75">
              测试时间: {new Date(provider.lastTested).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center justify-between mb-4">
        {/* 左侧按钮 */}
        <div className="flex items-center gap-2">
          {/* 移除加载模型列表按钮，与弹窗选择功能重复 */}
        </div>

        {/* 右侧按钮 */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                保存配置
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
            >
              编辑配置
            </button>
          )}
        </div>
      </div>

      {/* 快速模型选择 - 显示推荐模型 */}
      {models.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            推荐模型
          </label>
          <div className="flex flex-wrap gap-2">
            {getRecommendedModels().map((model) => (
              <button
                key={model.id}
                onClick={() => handleQuickModelSelect(model.id)}
                className={`px-3 py-1 text-sm rounded-full border ${
                  selectedModel === model.id
                    ? 'bg-primary-100 border-primary-500 text-primary-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {model.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 移除搜索框和模型选择下拉框，与弹窗选择功能重复 */}

      {/* 模型列表 */}
      {showModels && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-900">可用模型</h4>
            <button
              onClick={() => setShowModels(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              隐藏
            </button>
          </div>

          {/* 当前选择的模型 - 只保留这个显示 */}
          {selectedModel && (
            <div className="mb-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                {models.find(m => m.id === selectedModel) ? (
                  <div>
                    <div className="font-medium text-blue-900">
                      {models.find(m => m.id === selectedModel)?.name}
                    </div>
                    <div className="text-sm text-blue-700">
                      {models.find(m => m.id === selectedModel)?.description}
                    </div>
                  </div>
                ) : (
                  <div className="text-blue-700">
                    {selectedModel} (模型列表中未找到)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 模型列表 */}
          <div className="space-y-3">
            {getFilteredAndSortedModels().length > 0 ? (
              getFilteredAndSortedModels().map((model) => (
                <ModelInfoCard
                  key={model.id}
                  model={model}
                  isSelected={selectedModel === model.id}
                  onSelect={handleModelSelect}
                  compact={true}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>未找到匹配的模型</p>
                <p className="text-sm">请尝试调整搜索条件</p>
                <button
                  onClick={resetSearch}
                  className="mt-2 px-4 py-2 text-sm bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                >
                  重置搜索
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 模型选择弹窗 - 现代化设计 */}
      {showModelSelectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">选择AI模型</h3>
                  <p className="text-gray-600 mt-1">连接测试成功，请从以下模型中选择一个</p>
                </div>
                <button
                  onClick={() => setShowModelSelectionModal(false)}
                  className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
                >
                  <XIcon />
                </button>
              </div>
            </div>
            
            <div className="mb-4 p-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜索模型名称、描述或功能..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'capabilities' | 'pricing')}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="name">按名称排序</option>
                    <option value="capabilities">按功能排序</option>
                    <option value="pricing">按价格排序</option>
                  </select>
                  {(searchTerm || sortBy !== 'name') && (
                    <button
                      onClick={resetSearch}
                      className="px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
                    >
                      重置
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[60vh]">
              {models.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>暂无可用模型</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                  {getFilteredAndSortedModels().length > 0 ? (
                    getFilteredAndSortedModels().map((model) => (
                      <div
                        key={model.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                          selectedModel === model.id
                            ? 'border-primary-500 bg-primary-50 shadow-md'
                            : 'border-gray-200 hover:border-primary-300 hover:shadow-sm'
                        }`}
                        onClick={() => handleModelSelect(model)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900">{model.name}</h4>
                              {model.recommended && (
                                <span className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">
                                  推荐
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-2">{model.description}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                                {model.provider}
                              </span>
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                                {model.maxTokens >= 1000000
                                  ? `${(model.maxTokens / 1000000).toFixed(1)}M`
                                  : `${(model.maxTokens / 1000).toFixed(1)}K`} tokens
                              </span>
                              {model.capabilities.slice(0, 2).map((capability, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full"
                                >
                                  {capability}
                                </span>
                              ))}
                            </div>
                          </div>
                          {selectedModel === model.id && (
                            <div className="text-primary-600 ml-2">
                              <CheckIcon />
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 md:col-span-2">
                      <p>未找到匹配的模型</p>
                      <p className="text-sm">请尝试调整搜索条件</p>
                      <button
                        onClick={resetSearch}
                        className="mt-2 px-4 py-2 text-sm bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                      >
                        重置搜索
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowModelSelectionModal(false)}
                  className="px-5 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleModelSelectionComplete}
                  disabled={!selectedModel}
                  className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  确认选择
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 添加图标组件
function XIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}