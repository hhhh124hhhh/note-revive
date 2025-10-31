import React from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  type?: 'success' | 'error' | 'info' | 'warning';
}

export function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  confirmText = '确定',
  type = 'info'
}: AlertDialogProps) {
  if (!isOpen) return null;

  // 根据类型获取图标和颜色
  const getIconAndColor = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle size={24} className="text-green-600" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'error':
        return {
          icon: <XCircle size={24} className="text-red-600" />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={24} className="text-yellow-600" />,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      default:
        return {
          icon: <Info size={24} className="text-blue-600" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
    }
  };

  const { icon, bgColor, borderColor } = getIconAndColor();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full max-w-md animate-slide-up border-2 ${borderColor}`}>
        <div className="p-6">
          {/* 图标区域 */}
          <div className={`w-16 h-16 ${bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {icon}
          </div>

          {/* 标题和内容 */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 leading-relaxed">{message}</p>
          </div>

          {/* 确定按钮 */}
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium min-h-[48px]"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}