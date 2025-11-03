/**
 * 事件监听器管理器
 * 提供统一的事件监听器管理，确保正确的 passive 选项使用
 */

interface ListenerEntry {
  element: EventTarget;
  type: string;
  listener: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
  passive?: boolean;
}

class EventListenerManager {
  private static instance: EventListenerManager;
  private listeners: Set<ListenerEntry> = new Set();

  private constructor() {}

  public static getInstance(): EventListenerManager {
    if (!EventListenerManager.instance) {
      EventListenerManager.instance = new EventListenerManager();
    }
    return EventListenerManager.instance;
  }

  /**
   * 添加事件监听器，自动处理 passive 选项
   */
  add(
    element: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    // 确定是否应该使用 passive 选项
    const shouldUsePassive = this.shouldUsePassive(type, options);

    let finalOptions: boolean | AddEventListenerOptions | undefined;

    if (shouldUsePassive) {
      // 如果需要被动选项但未指定，则添加 passive: true
      if (typeof options === 'boolean') {
        finalOptions = { capture: options, passive: true };
      } else if (!options) {
        finalOptions = { passive: true };
      } else {
        finalOptions = { ...options, passive: true };
      }
    } else {
      finalOptions = options;
    }

    element.addEventListener(type, listener, finalOptions);

    // 记录监听器
    this.listeners.add({
      element,
      type,
      listener,
      options: finalOptions,
      passive: shouldUsePassive
    });
  }

  /**
   * 移除事件监听器
   */
  remove(
    element: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void {
    element.removeEventListener(type, listener, options);

    // 从记录中移除
    for (const entry of this.listeners) {
      if (
        entry.element === element &&
        entry.type === type &&
        entry.listener === listener
      ) {
        this.listeners.delete(entry);
        break;
      }
    }
  }

  /**
   * 移除元素的所有监听器
   */
  removeAllListeners(element: EventTarget): void {
    for (const entry of this.listeners) {
      if (entry.element === element) {
        this.remove(element, entry.type, entry.listener, entry.options);
      }
    }
  }

  /**
   * 清理所有监听器
   */
  cleanup(): void {
    for (const entry of this.listeners) {
      try {
        entry.element.removeEventListener(
          entry.type,
          entry.listener,
          entry.options
        );
      } catch (error) {
        console.warn('清理事件监听器失败:', error);
      }
    }
    this.listeners.clear();
  }

  /**
   * 获取监听器统计信息
   */
  getStats(): {
    total: number;
    passive: number;
    nonPassive: number;
    byType: Record<string, number>;
  } {
    let passive = 0;
    let nonPassive = 0;
    const byType: Record<string, number> = {};

    for (const entry of this.listeners) {
      if (entry.passive) {
        passive++;
      } else {
        nonPassive++;
      }

      byType[entry.type] = (byType[entry.type] || 0) + 1;
    }

    return {
      total: this.listeners.size,
      passive,
      nonPassive,
      byType
    };
  }

  /**
   * 判断是否应该使用 passive 选项
   */
  private shouldUsePassive(
    type: string,
    options?: boolean | AddEventListenerOptions
  ): boolean {
    // 如果已经指定了 passive 选项，则不修改
    if (typeof options === 'object' && options && 'passive' in options) {
      return options.passive === true;
    }

    // 对于可能阻塞滚动的事件，默认使用 passive
    const scrollBlockingEvents = [
      'touchstart',
      'touchmove',
      'wheel',
      'mousewheel',
      'scroll',
      'resize'
    ];

    // 对于非滚动阻塞事件，检查是否可能调用 preventDefault
    const nonPassiveEvents = [
      'keydown',
      'keyup',
      'keypress',
      'click',
      'dblclick',
      'mousedown',
      'mouseup',
      'submit',
      'contextmenu'
    ];

    if (scrollBlockingEvents.includes(type)) {
      // 滚动相关事件默认使用 passive
      return true;
    }

    if (nonPassiveEvents.includes(type)) {
      // 非滚动事件默认不使用 passive（因为可能需要 preventDefault）
      return false;
    }

    // 其他事件默认使用 passive
    return true;
  }
}

// 导出单例实例
export const eventListenerManager = EventListenerManager.getInstance();

// 便捷方法
export const addEventListener = (
  element: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions
) => {
  eventListenerManager.add(element, type, listener, options);
};

export const removeEventListener = (
  element: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | EventListenerOptions
) => {
  eventListenerManager.remove(element, type, listener, options);
};

// 针对常见场景的便捷方法
export const addScrollListener = (
  element: EventTarget,
  listener: EventListener,
  options?: AddEventListenerOptions
) => {
  eventListenerManager.add(element, 'scroll', listener, {
    passive: true,
    ...options
  });
};

export const addTouchListener = (
  element: EventTarget,
  listener: EventListener,
  options?: AddEventListenerOptions
) => {
  eventListenerManager.add(element, 'touchstart', listener, {
    passive: true,
    ...options
  });
};

export const addWheelListener = (
  element: EventTarget,
  listener: EventListener,
  options?: AddEventListenerOptions
) => {
  eventListenerManager.add(element, 'wheel', listener, {
    passive: true,
    ...options
  });
};

export const addKeyListener = (
  element: EventTarget,
  listener: EventListener,
  options?: AddEventListenerOptions
) => {
  eventListenerManager.add(element, 'keydown', listener, {
    passive: false,
    ...options
  });
};