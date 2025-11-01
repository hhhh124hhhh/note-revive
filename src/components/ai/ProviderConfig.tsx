/**
 * AI提供商配置组件
 * 用于配置和测试AI服务提供商
 */

import React, { useState, useEffect } from 'react';
import { DbAIProvider } from '../../db';
import { ModelInfo, CustomProviderConfig } from '../../services/ai/types';
import { aiSettingsService } from '../../services/ai';
import { ModelInfoCard, ModelComparison } from './ModelInfoCard';

interface ProviderConfigProps {
  provider: DbAIProvider;
  onUpdate?: (provider: DbAIProvider) => void;
  onTest?: (result: any) => void;
}

export function ProviderConfig({ provider, onUpdate, onTest }: ProviderConfigProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [customConfig, setCustomConfig] = useState<CustomProviderConfig | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showModels, setShowModels] = useState(false);

  useEffect(() => {
    // 初始化表单数据
    if (provider.apiKey) {
      // 这里应该解密API密钥，为了演示暂时使用占位符
      setApiKey('••••••••••••••••');
    }

    if (provider.selectedModel) {
      setSelectedModel(provider.selectedModel);
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
    if (!provider.apiKey && apiKey === '••••••••••••••••') {
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
    setSelectedModel(model.id);
    setIsEditing(true);
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
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            {isEditing ? '取消' : '编辑'}
          </button>
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
              onClick={() => aiSettingsService.toggleProvider(provider.id!)}
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
                  baseUrl: prev?.baseUrl || '',
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
      {isEditing && (
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleLoadModels}
            disabled={isLoadingModels}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            {isLoadingModels ? '加载中...' : '加载模型列表'}
          </button>
          <div className="flex items-center gap-2">
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
          </div>
        </div>
      )}

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

          {/* 当前选择的模型 */}
          {selectedModel && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                当前选择的模型
              </label>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                {models.find(m => m.id === selectedModel) ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-blue-900">
                        {models.find(m => m.id === selectedModel)?.name}
                      </div>
                      <div className="text-sm text-blue-700">
                        {models.find(m => m.id === selectedModel)?.description}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedModel('');
                        setIsEditing(true);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      更改
                    </button>
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
            {models.length > 0 ? (
              models.map((model) => (
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
                <p>暂无可用模型</p>
                <p className="text-sm">请检查API密钥是否正确</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}