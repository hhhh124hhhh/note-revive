import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { t } from '../../utils/i18n';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'default' | 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = t('confirm'),
  cancelText = t('cancel'),
  type = 'default',
  loading = false
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  // 根据类型获取样式配置
  const getStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <XCircle size={24} className="text-red-600" />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          buttonBg: 'bg-red-600 hover:bg-red-700',
          buttonTextColor: 'text-white'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={24} className="text-yellow-600" />,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
          buttonTextColor: 'text-white'
        };
      case 'info':
        return {
          icon: <Info size={24} className="text-blue-600" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          buttonBg: 'bg-blue-600 hover:bg-blue-700',
          buttonTextColor: 'text-white'
        };
      default:
        return {
          icon: <CheckCircle size={24} className="text-primary-600" />,
          bgColor: 'bg-primary-50',
          borderColor: 'border-primary-200',
          buttonBg: 'bg-primary-600 hover:bg-primary-700',
          buttonTextColor: 'text-white'
        };
    }
  };

  const styles = getStyles();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full max-w-md animate-slide-up border-2 ${styles.borderColor}`}>
        <div className="p-6">
          {/* 图标区域 */}
          <div className={`w-16 h-16 ${styles.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {styles.icon}
          </div>

          {/* 标题和内容 */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 leading-relaxed">{message}</p>
          </div>

          {/* 按钮区域 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[48px]"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 px-4 py-3 ${styles.buttonBg} ${styles.buttonTextColor} rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[48px] flex items-center justify-center gap-2`}
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}