/**
 * 模型详细信息卡片组件
 * 显示AI模型的详细信息和能力
 */
import { ModelInfo } from '../../services/ai/types';

interface ModelInfoCardProps {
  model: ModelInfo;
  isSelected?: boolean;
  onSelect?: (model: ModelInfo) => void;
  showPricing?: boolean;
  compact?: boolean;
}

export function ModelInfoCard({
  model,
  isSelected = false,
  onSelect,
  showPricing = true,
  compact = false
}: ModelInfoCardProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency === 'CNY' ? 'CNY' : 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const getCapabilityColor = (capability: string) => {
    const colors: Record<string, string> = {
      '对话': 'bg-blue-100 text-blue-800',
      '搜索': 'bg-green-100 text-green-800',
      '代码生成': 'bg-purple-100 text-purple-800',
      '分析': 'bg-yellow-100 text-yellow-800',
      '写作': 'bg-pink-100 text-pink-800',
      '翻译': 'bg-indigo-100 text-indigo-800',
      '快速响应': 'bg-orange-100 text-orange-800',
      '复杂任务': 'bg-red-100 text-red-800'
    };

    return colors[capability] || 'bg-gray-100 text-gray-800';
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(model);
    }
  };

  if (compact) {
    return (
      <div
        className={`
          p-3 rounded-lg border cursor-pointer transition-all
          ${isSelected
            ? 'border-primary-500 bg-primary-50 shadow-md'
            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
          }
        `}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900">{model.name}</h4>
              {model.recommended && (
                <span className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">
                  推荐
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">{model.description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>最大 {formatTokens(model.maxTokens)} tokens</span>
              {showPricing && (
                <span>
                  {formatCurrency(model.pricing.input, model.pricing.currency)}/1K输入
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        p-4 rounded-lg border cursor-pointer transition-all
        ${isSelected
          ? 'border-primary-500 bg-primary-50 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }
      `}
      onClick={handleClick}
    >
      {/* 头部信息 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{model.name}</h3>
            {model.recommended && (
              <span className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">
                推荐
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{model.provider}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">ID</div>
          <div className="text-xs font-mono text-gray-700">{model.id}</div>
        </div>
      </div>

      {/* 描述 */}
      <p className="text-gray-700 mb-4">{model.description}</p>

      {/* 能力标签 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">能力特点</h4>
        <div className="flex flex-wrap gap-1">
          {model.capabilities.map((capability, index) => (
            <span
              key={index}
              className={`px-2 py-1 text-xs rounded-full ${getCapabilityColor(capability)}`}
            >
              {capability}
            </span>
          ))}
        </div>
      </div>

      {/* 规格信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm text-gray-500">最大上下文</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatTokens(model.maxTokens)}
          </div>
        </div>

        {showPricing && (
          <>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-500">输入价格</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(model.pricing.input, model.pricing.currency)}
                <span className="text-xs text-gray-500 ml-1">/1K tokens</span>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-500">输出价格</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(model.pricing.output, model.pricing.currency)}
                <span className="text-xs text-gray-500 ml-1">/1K tokens</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 选中指示器 */}
      {isSelected && (
        <div className="flex items-center justify-center pt-2 border-t border-primary-200">
          <div className="flex items-center text-primary-600">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">已选择</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface ModelComparisonProps {
  models: ModelInfo[];
  selectedModel?: ModelInfo;
  onSelect?: (model: ModelInfo) => void;
}

export function ModelComparison({ models, selectedModel, onSelect }: ModelComparisonProps) {
  if (models.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="mb-2">
          <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p>暂无可用模型</p>
        <p className="text-sm">请先配置AI提供商并获取API密钥</p>
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency === 'CNY' ? 'CNY' : 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(amount);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              模型
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              最大上下文
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              输入价格
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              输出价格
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              能力
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {models.map((model) => (
            <tr
              key={model.id}
              className={`
                hover:bg-gray-50 cursor-pointer
                ${selectedModel?.id === model.id ? 'bg-primary-50' : ''}
              `}
              onClick={() => onSelect?.(model)}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {model.name}
                    {model.recommended && (
                      <span className="ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">
                        推荐
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">{model.provider}</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {model.maxTokens >= 1000000
                  ? `${(model.maxTokens / 1000000).toFixed(1)}M`
                  : `${(model.maxTokens / 1000).toFixed(1)}K`
                }
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(model.pricing.input, model.pricing.currency)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(model.pricing.output, model.pricing.currency)}
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1">
                  {model.capabilities.slice(0, 3).map((capability, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                    >
                      {capability}
                    </span>
                  ))}
                  {model.capabilities.length > 3 && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
                      +{model.capabilities.length - 3}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {selectedModel?.id === model.id ? (
                  <span className="text-primary-600 font-medium">已选择</span>
                ) : (
                  <button
                    className="text-primary-600 hover:text-primary-900 font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect?.(model);
                    }}
                  >
                    选择
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}