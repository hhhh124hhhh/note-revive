/**
 * 简化的 AI 条件渲染组件
 * 用于安全地渲染 AI 相关功能
 */

import React from 'react';

interface SimpleAIWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showStatus?: boolean;
}

export function SimpleAIWrapper({
  children,
  fallback = null,
  showStatus = false
}: SimpleAIWrapperProps) {
  const [isAIEnabled, setIsAIEnabled] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    // 检查 AI 功能状态
    const checkAIStatus = () => {
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        const enabled = import.meta.env.VITE_AI_ENABLED !== 'false';
        setIsAIEnabled(enabled);
      } else {
        setIsAIEnabled(false);
      }
    };

    checkAIStatus();
  }, []);

  // 渲染状态指示器
  const renderStatusIndicator = () => {
    if (!showStatus) return null;

    return (
      <div className="text-xs text-gray-500 mb-2">
        {isAIEnabled === true ? (
          <span className="text-green-600">● AI 已启用</span>
        ) : isAIEnabled === false ? (
          <span className="text-gray-400">● AI 已禁用</span>
        ) : (
          <span className="text-yellow-600">● AI 检测中...</span>
        )}
      </div>
    );
  };

  // 如果 AI 已启用，显示子组件
  if (isAIEnabled === true) {
    return (
      <>
        {renderStatusIndicator()}
        {children}
      </>
    );
  }

  // 如果 AI 已禁用，显示降级方案
  if (isAIEnabled === false) {
    return (
      <>
        {renderStatusIndicator()}
        {fallback}
      </>
    );
  }

  // 检测中，显示加载状态
  return (
    <>
      {renderStatusIndicator()}
      {fallback}
    </>
  );
}