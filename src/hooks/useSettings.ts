import { useState, useEffect, useCallback } from 'react';
import { DbSettings, Theme } from '../types';
import { getSettings, updateSettings, initDefaultSettings, safeDbOperation } from '../db';
import { THEMES } from '../constants/shortcuts';

// AI 功能环境变量检测函数
const isAIEnabled = (): boolean => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_AI_ENABLED !== 'false';
  }
  return true; // 默认启用，用于向后兼容
};

interface UseSettingsOptions {
  onThemeChange?: (theme: Theme) => void;
}

export const useSettings = (options: UseSettingsOptions = {}) => {
  const [settings, setSettings] = useState<DbSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        console.log('🔧 开始加载设置...');

        // 使用安全的数据库操作包装器，包含重试机制
        const settingsData = await safeDbOperation(async () => {
          return await getSettings();
        });

        console.log('✅ 设置加载成功:', settingsData);
        setSettings(settingsData);
      } catch (error) {
        console.error('❌ 加载设置失败:', error);

        // 提供用户友好的错误处理
        if (error instanceof Error && error.name === 'DatabaseClosedError') {
          console.warn('💡 数据库连接问题，尝试重新加载页面...');
          // 可以考虑在几次失败后提示用户刷新页面
        } else {
          console.warn('💡 设置加载失败，使用默认设置');
          // 设置默认值作为降级方案
          setSettings({
            id: 1,
            theme: 'light',
            fontSize: 'medium',
            autoSave: true,
            language: 'zh',
            exportFormat: 'json',
            aiEnabled: false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // 更新设置
  const updateAppSettings = useCallback(async (updates: Partial<DbSettings>) => {
    if (!settings) return;

    try {
      setUpdating(true);
      console.log('🔧 开始更新设置:', updates);

      // 使用安全的数据库操作包装器
      await safeDbOperation(async () => {
        await updateSettings(updates);
      });

      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      console.log('✅ 设置更新成功:', newSettings);

      // 如果主题改变，应用主题
      if (updates.theme && options.onThemeChange) {
        options.onThemeChange(updates.theme);
        applyTheme(updates.theme);
      }

      // 如果字体大小改变，应用字体大小
      if (updates.fontSize) {
        applyFontSize(updates.fontSize);
      }

      // 如果语言改变，应用语言
      if (updates.language) {
        applyLanguage(updates.language);
      }

      return newSettings;
    } catch (error) {
      console.error('❌ 更新设置失败:', error);

      // 提供用户友好的错误处理
      if (error instanceof Error && error.name === 'DatabaseClosedError') {
        console.warn('💡 数据库连接问题，设置更改未保存');
        // 可以考虑显示用户提示
      } else {
        console.warn('💡 设置更新失败，请重试');
      }

      throw error;
    } finally {
      setUpdating(false);
    }
  }, [settings, options]);

  // 应用字体大小
  const applyFontSize = useCallback((fontSize: 'small' | 'medium' | 'large') => {
    const body = document.body;

    // 移除所有字体大小类
    body.classList.remove('font-small', 'font-medium', 'font-large');

    // 添加新的字体大小类
    body.classList.add(`font-${fontSize}`);

    // 保存到 localStorage 以便页面刷新后保持设置
    localStorage.setItem('fontSize', fontSize);
  }, []);

  // 应用语言
  const applyLanguage = useCallback((language: 'zh' | 'en') => {
    const html = document.documentElement;

    // 设置 html 的 lang 属性
    html.setAttribute('lang', language);

    // 保存到 localStorage
    localStorage.setItem('language', language);

    // 触发自定义事件，通知其他组件语言已变更
    window.dispatchEvent(new CustomEvent('languagechange', { detail: language }));
  }, []);

  // 应用主题
  const applyTheme = useCallback((theme: Theme) => {
    const root = document.documentElement;
    const themeColors = THEMES[theme];

    if (themeColors) {
      // 应用主题色彩变量
      Object.entries(themeColors.primary).forEach(([key, value]) => {
        root.style.setProperty(`--color-primary-${key}`, value);
      });

      // 应用主题类名
      root.setAttribute('data-theme', theme);

      // 如果是暗色主题，添加dark类
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, []);

  // 初始化主题
  useEffect(() => {
    if (settings?.theme) {
      applyTheme(settings.theme);
    }
  }, [settings?.theme, applyTheme]);

  // 初始化字体大小
  useEffect(() => {
    if (settings?.fontSize) {
      applyFontSize(settings.fontSize);
    }
  }, [settings?.fontSize, applyFontSize]);

  // 初始化语言
  useEffect(() => {
    if (settings?.language) {
      applyLanguage(settings.language);
    }
  }, [settings?.language, applyLanguage]);

  // 页面加载时从 localStorage 恢复设置
  useEffect(() => {
    const savedFontSize = localStorage.getItem('fontSize') as 'small' | 'medium' | 'large';
    const savedLanguage = localStorage.getItem('language') as 'zh' | 'en';

    if (savedFontSize && !settings?.fontSize) {
      applyFontSize(savedFontSize);
    }

    if (savedLanguage && !settings?.language) {
      applyLanguage(savedLanguage);
    }
  }, [settings, applyFontSize, applyLanguage]);

  // 获取当前主题
  const getCurrentTheme = useCallback((): Theme => {
    return settings?.theme || 'light';
  }, [settings]);

  // 切换主题
  const toggleTheme = useCallback(async () => {
    const currentTheme = getCurrentTheme();
    const themeOrder: Theme[] = ['light', 'dark', 'blue', 'green', 'purple', 'orange'];
    const currentIndex = themeOrder.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    const nextTheme = themeOrder[nextIndex];

    await updateAppSettings({ theme: nextTheme });
  }, [getCurrentTheme, updateAppSettings]);

  // 重置设置为默认
  const resetToDefaults = useCallback(async () => {
    try {
      await initDefaultSettings();
      const defaultSettings = await getSettings();
      setSettings(defaultSettings);

      if (defaultSettings?.theme && options.onThemeChange) {
        options.onThemeChange(defaultSettings.theme);
        applyTheme(defaultSettings.theme);
      }

      return defaultSettings;
    } catch (error) {
      console.error('重置设置失败:', error);
      throw error;
    }
  }, [options, applyTheme]);

  return {
    // 状态
    settings,
    loading,
    updating,

    // 方法
    updateSettings: updateAppSettings,
    applyTheme,
    applyFontSize,
    applyLanguage,
    getCurrentTheme,
    toggleTheme,
    resetToDefaults,

    // 便捷属性
    theme: settings?.theme || 'light',
    fontSize: settings?.fontSize || 'medium',
    language: settings?.language || 'zh',
    autoSave: settings?.autoSave ?? true,
    exportFormat: settings?.exportFormat || 'json',
    aiEnabled: settings?.aiEnabled ?? false,

    // AI 功能可用性检查方法
    isAIFeatureAvailable: isAIEnabled,
    getAIStatus: () => ({
      enabled: settings?.aiEnabled ?? false,
      available: isAIEnabled(),
      canUse: (settings?.aiEnabled ?? false) && isAIEnabled()
    })
  };
};