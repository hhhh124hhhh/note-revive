/**
 * 错误过滤器
 * 过滤掉浏览器扩展和开发环境中常见的无害错误
 */

// 需要过滤的错误消息模式
const ERROR_PATTERNS = [
  // Chrome/Edge 扩展相关错误
  /runtime\.lastError/i,
  /message port closed/i,
  /receiving end does not exist/i,
  /the message port closed before a response was received/i,
  /extension context invalidated/i,
  /chrome-extension/i,

  // 开发环境常见错误
  /devtools/i,
  /react devtools/i,
  /hot module replacement/i,
  /webpackHotUpdate/i,

  // 第三方库常见错误（现在已经修复）
  /non-passive event listener.*touch/i,
  /non-passive event listener.*wheel/i,
  /non-passive event listener.*scroll/i,
  /violation.*passive/i,

  // 浏览器警告
  /warning.*react/i,
  /react\.dom\.hydrate/i,
  /deprecated/i,
];

/**
 * 检查错误是否应该被过滤
 */
export function shouldFilterError(message: string): boolean {
  if (typeof message !== 'string') {
    return false;
  }

  return ERROR_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * 获取错误的详细信息（用于调试）
 */
export function getErrorInfo(error: any): {
  isFiltered: boolean;
  type: 'extension' | 'development' | 'third-party' | 'application' | 'unknown';
  severity: 'low' | 'medium' | 'high';
  message: string;
} {
  let message = '';
  let type: any = 'unknown';
  let severity: any = 'medium';

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object') {
    message = error.message || error.toString();
  } else {
    message = String(error);
  }

  // 确定错误类型和严重程度
  if (/runtime\.lastError|message port closed|extension context/i.test(message)) {
    type = 'extension';
    severity = 'low';
  } else if (/devtools|react devtools|webpackHotUpdate/i.test(message)) {
    type = 'development';
    severity = 'low';
  } else if (/non-passive event listener|violation.*passive/i.test(message)) {
    type = 'third-party';
    severity = 'medium';
  } else if (/warning.*react|deprecated/i.test(message)) {
    type = 'third-party';
    severity = 'low';
  } else if (shouldFilterError(message)) {
    type = 'third-party';
    severity = 'low';
  } else {
    type = 'application';
    severity = 'high';
  }

  const isFiltered = shouldFilterError(message);

  return {
    isFiltered,
    type,
    severity,
    message
  };
}

/**
 * 初始化错误过滤器
 */
export function initializeErrorFilter(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // 过滤 console.error
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const errorInfo = getErrorInfo(args[0]);

    if (errorInfo.isFiltered) {
      // 在开发模式下仍然显示被过滤的错误，但标记为已过滤
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        originalConsoleError(
          `%c[已过滤] ${errorInfo.message}`,
          'color: #888; font-style: italic;',
          ...args.slice(1),
          `\n类型: ${errorInfo.type}, 严重程度: ${errorInfo.severity}`
        );
      }
      return;
    }

    originalConsoleError.apply(console, args);
  };

  // 过滤 console.warn（可选）
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    const errorInfo = getErrorInfo(args[0]);

    if (errorInfo.isFiltered && errorInfo.severity === 'low') {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        originalConsoleWarn(
          `%c[已过滤警告] ${errorInfo.message}`,
          'color: #888; font-style: italic;',
          ...args.slice(1)
        );
      }
      return;
    }

    originalConsoleWarn.apply(console, args);
  };

  // 监听未捕获的错误
  const originalHandler = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const errorInfo = getErrorInfo(message);

    if (errorInfo.isFiltered && errorInfo.severity === 'low') {
      return true; // 阻止默认错误处理
    }

    if (originalHandler) {
      return originalHandler.call(window, message, source, lineno, colno, error);
    }

    return false;
  };

  // 监听未捕获的 Promise 拒绝
  const originalRejectionHandler = window.onunhandledrejection;
  window.onunhandledrejection = (event) => {
    const errorInfo = getErrorInfo(event.reason);

    if (errorInfo.isFiltered && errorInfo.severity === 'low') {
      event.preventDefault(); // 阻止默认错误处理
      return;
    }

    if (originalRejectionHandler) {
      return originalRejectionHandler.call(window, event);
    }
  };

  console.log('✅ 错误过滤器已初始化');
}

/**
 * 获取错误统计信息
 */
export function getErrorStats(): {
  totalErrors: number;
  filteredErrors: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
} {
  // 这里可以实现错误统计功能
  return {
    totalErrors: 0,
    filteredErrors: 0,
    byType: {},
    bySeverity: {}
  };
}

/**
 * 手动过滤错误（用于测试）
 */
export function testErrorFilter(errorMessage: string): {
  filtered: boolean;
  info: ReturnType<typeof getErrorInfo>;
} {
  const info = getErrorInfo(errorMessage);
  return {
    filtered: info.isFiltered,
    info
  };
}

// 在模块加载时自动初始化
if (typeof window !== 'undefined' && typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  initializeErrorFilter();
}
