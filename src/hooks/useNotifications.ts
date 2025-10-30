import { useState, useCallback, useEffect } from 'react';
import { Notification, NotificationType } from '../components/NotificationPanel';

interface UseNotificationsOptions {
  maxNotifications?: number;
  defaultDuration?: number;
  enablePanel?: boolean;
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const {
    maxNotifications = 10,
    defaultDuration = 5000,
    enablePanel = true
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // 添加通知
  const addNotification = useCallback((
    type: NotificationType,
    title: string,
    message?: string,
    options?: {
      points?: number;
      duration?: number;
      autoClose?: boolean;
      showInPanel?: boolean;
    }
  ) => {
    const {
      points,
      duration = defaultDuration,
      autoClose = true,
      showInPanel = enablePanel
    } = options || {};

    const newNotification: Notification = {
      id: `notification-${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
      points,
      timestamp: new Date(),
      autoClose,
      duration: autoClose ? duration : undefined
    };

    setNotifications(prev => {
      const updated = [...prev, newNotification];
      // 限制通知数量
      return updated.slice(-maxNotifications);
    });

    // 如果是临时通知且需要自动关闭，设置定时器
    if (autoClose && !showInPanel && duration) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, duration);
    }

    return newNotification.id;
  }, [defaultDuration, enablePanel, maxNotifications]);

  // 移除通知
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // 清空所有通知
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // 便捷方法
  const showSuccess = useCallback((
    title: string,
    message?: string,
    options?: Omit<Parameters<typeof addNotification>[3], 'type'>
  ) => {
    return addNotification('success', title, message, options);
  }, [addNotification]);

  const showError = useCallback((
    title: string,
    message?: string,
    options?: Omit<Parameters<typeof addNotification>[3], 'type'>
  ) => {
    return addNotification('error', title, message, { ...options, autoClose: false, duration: undefined });
  }, [addNotification]);

  const showInfo = useCallback((
    title: string,
    message?: string,
    options?: Omit<Parameters<typeof addNotification>[3], 'type'>
  ) => {
    return addNotification('info', title, message, options);
  }, [addNotification]);

  const showAchievement = useCallback((
    title: string,
    message?: string,
    points?: number,
    options?: Omit<Parameters<typeof addNotification>[3], 'type'>
  ) => {
    return addNotification('achievement', title, message, { ...options, points, autoClose: true, duration: 6000 });
  }, [addNotification]);

  // 替换 alert 的方法
  const alert = useCallback((
    title: string,
    message?: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    switch (type) {
      case 'success':
        showSuccess(title, message, { autoClose: false });
        break;
      case 'error':
        showError(title, message);
        break;
      default:
        showInfo(title, message, { autoClose: false });
    }
  }, [showSuccess, showError, showInfo]);

  // 切换面板显示
  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev);
  }, []);

  // 自动清理过期的通知
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setNotifications(prev =>
        prev.filter(notification => {
          // 如果通知有持续时间且已过期，则移除
          if (notification.autoClose && notification.duration) {
            const age = now.getTime() - notification.timestamp.getTime();
            return age < notification.duration;
          }
          return true;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    // 状态
    notifications,
    isPanelOpen,

    // 方法
    addNotification,
    removeNotification,
    clearNotifications,
    togglePanel,

    // 便捷方法
    showSuccess,
    showError,
    showInfo,
    showAchievement,
    alert,

    // 统计信息
    unreadCount: notifications.length,
    hasNotifications: notifications.length > 0
  };
};