import { useState, useEffect, useCallback } from 'react';
import { DbSettings, Theme } from '../types';
import { getSettings, updateSettings, initDefaultSettings } from '../db';
import { THEMES } from '../constants/shortcuts';

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
        const settingsData = await getSettings();
        setSettings(settingsData);
      } catch (error) {
        console.error('加载设置失败:', error);
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
      await updateSettings(updates);
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);

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
      console.error('更新设置失败:', error);
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
    aiEnabled: settings?.aiEnabled ?? false
  };
};