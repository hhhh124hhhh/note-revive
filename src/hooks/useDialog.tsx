import { useState, useCallback } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { AlertDialog } from '../components/ui/AlertDialog';
import { t } from '../utils/i18n';

export type DialogType = 'confirm' | 'alert' | 'error' | 'success' | 'info' | 'warning' | 'danger';

interface DialogState {
  isOpen: boolean;
  type: DialogType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  loading?: boolean;
}

export function useDialog() {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: ''
  });

  const closeDialog = useCallback(() => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const showConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    options?: {
      confirmText?: string;
      cancelText?: string;
      type?: DialogType;
    }
  ) => {
    setDialogState({
      isOpen: true,
      type: options?.type || 'confirm',
      title,
      message,
      confirmText: options?.confirmText || t('confirm'),
      cancelText: options?.cancelText || t('cancel'),
      onConfirm: async () => {
        if (onConfirm) {
          setDialogState(prev => ({ ...prev, loading: true }));
          try {
            await onConfirm();
          } finally {
            closeDialog();
          }
        } else {
          closeDialog();
        }
      },
      loading: false
    });
  }, [closeDialog]);

  const showAlert = useCallback((
    title: string,
    message: string,
    type: DialogType = 'info'
  ) => {
    setDialogState({
      isOpen: true,
      type,
      title,
      message,
      confirmText: t('ok'),
      onConfirm: closeDialog,
      loading: false
    });
  }, [closeDialog]);

  const showError = useCallback((title: string, message: string) => {
    showAlert(title, message, 'error');
  }, [showAlert]);

  const showSuccess = useCallback((title: string, message: string) => {
    showAlert(title, message, 'success');
  }, [showAlert]);

  const showInfo = useCallback((title: string, message: string) => {
    showAlert(title, message, 'info');
  }, [showAlert]);

  const showWarning = useCallback((title: string, message: string) => {
    showAlert(title, message, 'warning');
  }, [showAlert]);

  const showDanger = useCallback((title: string, message: string, onConfirm: () => void | Promise<void>) => {
    showConfirm(title, message, onConfirm, { type: 'danger' });
  }, [showConfirm]);

  // 渲染弹窗组件
  const DialogComponent = () => {
    if (!dialogState.isOpen) return null;

    if (dialogState.type === 'confirm' || 
        dialogState.type === 'danger' || 
        dialogState.type === 'warning') {
      return (
        <ConfirmDialog
          isOpen={dialogState.isOpen}
          onClose={closeDialog}
          onConfirm={dialogState.onConfirm!}
          title={dialogState.title}
          message={dialogState.message}
          confirmText={dialogState.confirmText}
          cancelText={dialogState.cancelText}
          type={dialogState.type === 'danger' ? 'danger' : 
                dialogState.type === 'warning' ? 'warning' : 'default'}
          loading={dialogState.loading}
        />
      );
    }

    return (
      <AlertDialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText!}
        type={dialogState.type === 'alert' ? 'info' : dialogState.type as any}
      />
    );
  };

  return {
    showConfirm,
    showAlert,
    showError,
    showSuccess,
    showInfo,
    showWarning,
    showDanger,
    closeDialog,
    DialogComponent
  };
}