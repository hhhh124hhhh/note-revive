import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, Award, TrendingUp } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'achievement';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  points?: number;
  timestamp: Date;
  autoClose?: boolean;
  duration?: number;
}

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: (id: string) => void;
  onClearAll: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onClose,
  onClearAll
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notifications.length > 0) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [notifications.length]);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={20} className="text-red-500" />;
      case 'achievement':
        return <Award size={20} className="text-yellow-500" />;
      default:
        return <Info size={20} className="text-blue-500" />;
    }
  };

  const getNotificationStyle = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      case 'achievement':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
      default:
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return '刚刚';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`;
    return `${Math.floor(seconds / 86400)}天前`;
  };

  if (!isVisible || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
      <div className="h-full flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            通知中心
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onClearAll}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              清空全部
            </button>
            <button
              onClick={() => notifications.forEach(n => onClose(n.id))}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={18} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* 通知列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border-2 transition-all duration-300 hover:shadow-md ${getNotificationStyle(
                notification.type
              )}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {notification.title}
                    </h4>
                    <button
                      onClick={() => onClose(notification.id)}
                      className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <X size={14} className="text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>

                  {notification.message && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {notification.message}
                    </p>
                  )}

                  {notification.points && (
                    <div className="mt-2 flex items-center gap-1">
                      <TrendingUp size={14} className="text-yellow-600 dark:text-yellow-400" />
                      <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                        +{notification.points} 积分
                      </span>
                    </div>
                  )}

                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(notification.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 底部 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>共 {notifications.length} 条通知</span>
            <span>自动关闭已开启</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 单个通知卡片组件（用于临时显示）
interface NotificationCardProps {
  notification: Notification;
  onClose: () => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onClose
}) => {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (notification.autoClose && notification.duration) {
      const timer = setTimeout(() => {
        setIsLeaving(true);
        setTimeout(onClose, 300);
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.autoClose, notification.duration, onClose]);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={20} className="text-red-500" />;
      case 'achievement':
        return <Award size={20} className="text-yellow-500" />;
      default:
        return <Info size={20} className="text-blue-500" />;
    }
  };

  const getNotificationStyle = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      case 'achievement':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
      default:
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 w-80 p-4 rounded-lg border-2 shadow-lg transform transition-all duration-300 ${
        isLeaving ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      } ${getNotificationStyle(notification.type)}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getNotificationIcon(notification.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
              {notification.title}
            </h4>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={14} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {notification.message && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {notification.message}
            </p>
          )}

          {notification.points && (
            <div className="mt-2 flex items-center gap-1">
              <TrendingUp size={14} className="text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                +{notification.points} 积分
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;