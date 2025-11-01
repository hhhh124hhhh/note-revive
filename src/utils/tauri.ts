import { invoke } from '@tauri-apps/api/core';

// 检测是否在Tauri环境中
export const isTauriApp = () => {
  return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
};

// Tauri特定的API调用
export const tauriAPI = {
  // 调用Rust后端函数
  greet: async (name: string) => {
    if (isTauriApp()) {
      try {
        return await invoke<string>('greet', { name });
      } catch (error) {
        console.error('Tauri API调用失败:', error);
        return null;
      }
    }
    return null;
  },

  // 获取应用版本
  getAppVersion: async () => {
    if (isTauriApp()) {
      try {
        const { getVersion } = await import('@tauri-apps/api/app');
        return await getVersion();
      } catch (error) {
        console.error('获取应用版本失败:', error);
        return '2.0.0';
      }
    }
    return '2.0.0';
  },

  // 窗口操作
  window: {
    minimize: async () => {
      if (isTauriApp()) {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const window = getCurrentWindow();
          await window.minimize();
        } catch (error) {
          console.error('窗口最小化失败:', error);
        }
      }
    },
    
    maximize: async () => {
      if (isTauriApp()) {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const window = getCurrentWindow();
          await window.toggleMaximize();
        } catch (error) {
          console.error('窗口最大化失败:', error);
        }
      }
    },
    
    close: async () => {
      if (isTauriApp()) {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const window = getCurrentWindow();
          await window.close();
        } catch (error) {
          console.error('窗口关闭失败:', error);
        }
      }
    }
  },

  // 显示关于对话框
  showAbout: async () => {
    if (isTauriApp()) {
      try {
        // 简化实现，避免dialog模块问题
        alert('Note Revive v2.0.0\n\n智能便签管理应用\n支持Markdown编辑和数据加密');
      } catch (error) {
        console.error('显示关于对话框失败:', error);
      }
    } else {
      alert('Note Revive v2.0.0\n\n智能便签管理应用\n支持Markdown编辑和数据加密');
    }
  }
};