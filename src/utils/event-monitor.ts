/**
 * 事件监听器监控工具
 * 用于检测和诊断事件监听器相关问题
 */

interface EventListenerInfo {
  id: string;
  element: string;
  type: string;
  handler: string;
  passive: boolean;
  capture: boolean;
  addedAt: number;
  source: string;
}

class EventMonitor {
  private static instance: EventMonitor;
  private listeners = new Map<string, EventListenerInfo>();
  private originalAddEventListener!: typeof EventTarget.prototype.addEventListener;
  private originalRemoveEventListener!: typeof EventTarget.prototype.removeEventListener;
  private isEnabled = false;

  private constructor() {}

  public static getInstance(): EventMonitor {
    if (!EventMonitor.instance) {
      EventMonitor.instance = new EventMonitor();
    }
    return EventMonitor.instance;
  }

  /**
   * 启用事件监控
   */
  enable(): void {
    if (this.isEnabled) {
      return;
    }

    this.isEnabled = true;
    this.originalAddEventListener = EventTarget.prototype.addEventListener;
    this.originalRemoveEventListener = EventTarget.prototype.removeEventListener;

    const self = this;

    // 重写 addEventListener
    EventTarget.prototype.addEventListener = function(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) {
      const info = self.createListenerInfo(this, type, listener, options);
      self.listeners.set(info.id, info);

      // 调用原始方法
      return self.originalAddEventListener.call(this, type, listener, options);
    };

    // 重写 removeEventListener
    EventTarget.prototype.removeEventListener = function(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ) {
      const info = self.createListenerInfo(this, type, listener, options);
      self.listeners.delete(info.id);

      return self.originalRemoveEventListener.call(this, type, listener, options);
    };

    console.log('🔍 事件监控已启用');
  }

  /**
   * 禁用事件监控
   */
  disable(): void {
    if (!this.isEnabled) {
      return;
    }

    EventTarget.prototype.addEventListener = this.originalAddEventListener;
    EventTarget.prototype.removeEventListener = this.originalRemoveEventListener;
    this.isEnabled = false;

    console.log('⏹️ 事件监控已禁用');
  }

  /**
   * 创建监听器信息
   */
  private createListenerInfo(
    element: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): EventListenerInfo {
    const id = this.generateId(element, type, listener);
    const elementString = this.getElementDescription(element);
    const handlerString = this.getHandlerDescription(listener);

    let passive = false;
    let capture = false;

    if (typeof options === 'object') {
      passive = options.passive === true;
      capture = options.capture === true;
    } else {
      capture = options === true;
    }

    // 检查是否是滚动相关事件
    const isScrollEvent = ['touchstart', 'touchmove', 'wheel', 'mousewheel', 'scroll'].includes(type);

    return {
      id,
      element: elementString,
      type,
      handler: handlerString,
      passive,
      capture,
      addedAt: Date.now(),
      source: this.getCallSource()
    };
  }

  /**
   * 生成唯一ID
   */
  private generateId(element: EventTarget, type: string, listener: EventListenerOrEventListenerObject): string {
    const elementId = this.getElementId(element);
    const listenerId = (listener as any).toString?.slice(0, 50) || 'anonymous';
    return `${elementId}_${type}_${listenerId}_${Date.now()}`;
  }

  /**
   * 获取元素描述
   */
  private getElementDescription(element: EventTarget): string {
    if (element === window) return 'window';
    if (element === document) return 'document';
    if (element === document.body) return 'body';

    if (element instanceof HTMLElement) {
      const tagName = element.tagName.toLowerCase();
      const id = element.id ? `#${element.id}` : '';
      const className = element.className ? `.${element.className.split(' ').join('.')}` : '';
      return `${tagName}${id}${className}`;
    }

    return element.constructor.name;
  }

  /**
   * 获取元素ID
   */
  private getElementId(element: EventTarget): string {
    if (element === window) return 'window';
    if (element === document) return 'document';
    if (element instanceof HTMLElement && element.id) return element.id;

    // 生成基于对象引用的ID
    return (element as any).__eventId || ((element as any).__eventId = Math.random().toString(36).substr(2, 9));
  }

  /**
   * 获取处理器描述
   */
  private getHandlerDescription(listener: EventListenerOrEventListenerObject): string {
    if (typeof listener === 'function') {
      const funcName = listener.name || 'anonymous';
      const funcStr = listener.toString();
      if (funcName !== 'anonymous') {
        return `function ${funcName}`;
      }

      // 尝试从函数字符串提取信息
      if (funcStr.includes('handleKeyDown') || funcStr.includes('keydown')) {
        return 'key handler';
      }
      if (funcStr.includes('handleScroll') || funcStr.includes('scroll')) {
        return 'scroll handler';
      }
      if (funcStr.includes('handleTouch') || funcStr.includes('touch')) {
        return 'touch handler';
      }

      return funcStr.slice(0, 50) + '...';
    }

    return 'object listener';
  }

  /**
   * 获取调用来源
   */
  private getCallSource(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown';

    const lines = stack.split('\n');
    // 跳过当前函数和addEventListener调用
    const relevantLine = lines[5] || lines[4] || lines[3];

    if (relevantLine) {
      const match = relevantLine.match(/at\s+(.+?)\s+\(/);
      return match ? match[1] : 'unknown';
    }

    return 'unknown';
  }

  /**
   * 获取所有监听器信息
   */
  getListeners(): EventListenerInfo[] {
    return Array.from(this.listeners.values());
  }

  /**
   * 获取有问题的监听器
   */
  getProblematicListeners(): {
    nonPassiveScrollEvents: EventListenerInfo[];
    potentialBlockingListeners: EventListenerInfo[];
    duplicateListeners: Array<EventListenerInfo[]>;
  } {
    const all = this.getListeners();

    // 找出非被动的滚动事件监听器
    const nonPassiveScrollEvents = all.filter(listener => {
      const scrollEvents = ['touchstart', 'touchmove', 'wheel', 'mousewheel', 'scroll'];
      return scrollEvents.includes(listener.type) && !listener.passive;
    });

    // 找出可能阻塞的监听器
    const potentialBlockingListeners = all.filter(listener => {
      const blockingEvents = ['touchstart', 'touchmove', 'wheel'];
      return blockingEvents.includes(listener.type) && listener.capture;
    });

    // 找出重复的监听器
    const groups = new Map<string, EventListenerInfo[]>();
    for (const listener of all) {
      const key = `${listener.element}_${listener.type}_${listener.handler}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(listener);
    }

    const duplicateListeners = Array.from(groups.values()).filter(group => group.length > 1);

    return {
      nonPassiveScrollEvents,
      potentialBlockingListeners,
      duplicateListeners
    };
  }

  /**
   * 生成监控报告
   */
  generateReport(): string {
    const all = this.getListeners();
    const problematic = this.getProblematicListeners();

    let report = '📊 事件监听器监控报告\n';
    report += '========================\n\n';

    report += `总监听器数量: ${all.length}\n\n`;

    // 问题监听器
    if (problematic.nonPassiveScrollEvents.length > 0) {
      report += `⚠️ 非被动滚动事件 (${problematic.nonPassiveScrollEvents.length}):\n`;
      for (const listener of problematic.nonPassiveScrollEvents) {
        report += `  - ${listener.type} on ${listener.element} (${listener.source})\n`;
      }
      report += '\n';
    }

    if (problematic.potentialBlockingListeners.length > 0) {
      report += `🚫 可能阻塞的监听器 (${problematic.potentialBlockingListeners.length}):\n`;
      for (const listener of problematic.potentialBlockingListeners) {
        report += `  - ${listener.type} on ${listener.element} (${listener.source})\n`;
      }
      report += '\n';
    }

    if (problematic.duplicateListeners.length > 0) {
      report += `🔁 重复监听器 (${problematic.duplicateListeners.length} 组):\n`;
      for (const group of problematic.duplicateListeners) {
        report += `  - ${group[0].type} on ${group[0].element} (${group.length} 个实例)\n`;
      }
      report += '\n';
    }

    // 类型统计
    const typeStats = new Map<string, number>();
    for (const listener of all) {
      typeStats.set(listener.type, (typeStats.get(listener.type) || 0) + 1);
    }

    report += '📈 事件类型统计:\n';
    const sortedTypes = Array.from(typeStats.entries()).sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sortedTypes.slice(0, 10)) {
      report += `  - ${type}: ${count}\n`;
    }

    return report;
  }

  /**
   * 检查特定元素上的监听器
   */
  checkElement(element: EventTarget): EventListenerInfo[] {
    const elementDesc = this.getElementDescription(element);
    return this.getListeners().filter(listener => listener.element === elementDesc);
  }

  /**
   * 清理监控数据
   */
  clear(): void {
    this.listeners.clear();
    console.log('🧹 事件监控数据已清理');
  }
}

// 导出单例实例
export const eventMonitor = EventMonitor.getInstance();

// 便捷方法
export function enableEventMonitoring(): void {
  eventMonitor.enable();
}

export function disableEventMonitoring(): void {
  eventMonitor.disable();
}

export function getEventMonitoringReport(): string {
  return eventMonitor.generateReport();
}

// 开发环境下自动启用
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  setTimeout(() => {
    console.log('🔍 启用事件监控（开发模式）');
    enableEventMonitoring();

    // 5秒后生成报告
    setTimeout(() => {
      const report = getEventMonitoringReport();
      console.log(report);

      // 如果有问题，给出建议
      const problematic = eventMonitor.getProblematicListeners();
      if (problematic.nonPassiveScrollEvents.length > 0) {
        console.warn('⚠️ 发现非被动滚动事件监听器，建议使用 passive: true 选项');
      }
    }, 5000);
  }, 1000);
}