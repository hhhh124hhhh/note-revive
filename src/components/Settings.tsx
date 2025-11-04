import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Palette,
  Type,
  Globe,
  Zap,
  Database,
  Download,
  Trash2,
  RotateCcw,
  Monitor,
  Moon,
  Sun,
  Save,
  RefreshCw
} from 'lucide-react';
import { DbSettings, DbCustomShortcut, Theme, FontSize, Language, ExportFormat } from '../types';
import { getShortcuts, updateShortcut, resetShortcutsToDefault, checkShortcutConflict } from '../db';
import { downloadFile, generateExportFilename, exportNotes } from '../utils/format';
import { useDialog } from '../hooks/useDialog';
import { useSettings } from '../hooks/useSettings';
import { useShortcuts } from '../hooks/useShortcuts';
import { t } from '../utils/i18n';
import { EnhancedAISettings } from './EnhancedAISettings';
import { SimpleAIWrapper } from './AIWrapperSimple';

interface SettingsProps {
  onClose?: () => void;
  onThemeChange?: (theme: Theme) => void;
}

// AI 功能环境变量检测函数
const isAIEnabled = (): boolean => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_AI_ENABLED !== 'false';
  }
  return true; // 默认启用，用于向后兼容
};

const Settings: React.FC<SettingsProps> = ({ onClose, onThemeChange }) => {
  const [isAIAvailable, setIsAIAvailable] = useState<boolean | null>(null);
  const [shortcuts, setShortcuts] = useState<DbCustomShortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'shortcuts' | 'data' | 'ai'>('general');
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [tempKeys, setTempKeys] = useState('');
  const [conflictError, setConflictError] = useState<string | null>(null);

  // 使用 useSettings Hook
  const {
    settings,
    loading: settingsLoading,
    updating: settingsUpdating,
    updateSettings: updateAppSettings
  } = useSettings({
    onThemeChange
  });

  const { getActionName } = useShortcuts();

  // 现代弹窗系统
  const { showConfirm, showError, showSuccess } = useDialog();

  // 检查 AI 功能可用性
  useEffect(() => {
    const checkAIAvailability = () => {
      const enabled = isAIEnabled();
      setIsAIAvailable(enabled);
      console.log(`AI 功能可用性: ${enabled ? '启用' : '禁用'}`);
    };

    checkAIAvailability();
  }, []);

  // 加载快捷键数据
  useEffect(() => {
    const loadShortcuts = async () => {
      try {
        const shortcutsData = await getShortcuts();
        setShortcuts(shortcutsData);
      } catch (error) {
        console.error('Failed to load shortcuts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadShortcuts();
  }, []);

  // 保存设置（使用 Hook 的方法）
  const saveSettings = async (updates: Partial<DbSettings>, showSuccessMessage = true) => {
    if (!settings) return;

    try {
      await updateAppSettings(updates);

      // 显示成功提示（可选）
      if (showSuccessMessage) {
        if (updates.language) {
          showSuccess(t('languageApplied'), t('language'));
        } else if (updates.fontSize) {
          showSuccess(t('fontSizeApplied'), t('fontSize'));
        } else if (updates.theme) {
          showSuccess(t('themeApplied'), t('theme'));
        } else {
          showSuccess(t('settingsApplied'), t('settings'));
        }
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      showError(t('saveFailed'), t('settingsSaveFailed'));
    }
  };

  // 保存快捷键
  const saveShortcut = async (id: string, updates: Partial<DbCustomShortcut>) => {
    try {
      // 检查快捷键冲突
      if (updates.keys && updates.keys !== tempKeys) {
        const hasConflict = await checkShortcutConflict(updates.keys, id);
        if (hasConflict) {
          setConflictError(t('shortcutExists'));
          return;
        }
      }

      await updateShortcut(id, updates);
      setShortcuts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      setEditingShortcut(null);
      setTempKeys('');
      setConflictError(null);
    } catch (error) {
      console.error('Failed to save shortcut:', error);
      setConflictError(t('saveFailedRetry'));
    }
  };

  // 重置快捷键
  const resetShortcuts = async () => {
    showConfirm(
      t('resetShortcuts'),
      t('confirmResetShortcuts'),
      async () => {
        try {
          await resetShortcutsToDefault();
          const newShortcuts = await getShortcuts();
          setShortcuts(newShortcuts);
        } catch (error) {
          console.error('Failed to reset shortcuts:', error);
          showError(t('resetFailed'), t('errorRetry'));
        }
      }
    );
  };

  // 导出数据
  const exportData = async () => {
    if (!settings) return;

    try {
      // 这里需要导入db来获取便签数据
      const { db } = await import('../db');
      const notes = await db.notes.toArray();
      const exportedData = exportNotes(notes, settings.exportFormat);
      const filename = generateExportFilename(settings.exportFormat);

      const mimeType = settings.exportFormat === 'json' ? 'application/json' :
                      settings.exportFormat === 'markdown' ? 'text/markdown' : 'text/plain';

      downloadFile(exportedData, filename, mimeType);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  if (loading || settingsLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-primary-600" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8 text-center text-gray-500">
        <SettingsIcon size={48} className="mx-auto mb-4" />
        <p>{t('loadSettingsFailed')}</p>
      </div>
    );
  }

  // 主题选项
  const themeOptions = [
    { value: 'light', label: t('lightTheme'), icon: <Sun size={16} /> },
    { value: 'dark', label: t('darkTheme'), icon: <Moon size={16} /> },
    { value: 'blue', label: t('blueTheme'), icon: <Palette size={16} /> },
    { value: 'green', label: t('greenTheme'), icon: <Palette size={16} /> },
    { value: 'purple', label: t('purpleTheme'), icon: <Palette size={16} /> },
    { value: 'orange', label: t('orangeTheme'), icon: <Palette size={16} /> }
  ];

  // 字体大小选项
  const fontSizeOptions = [
    { value: 'small', label: t('smallFont'), preview: t('smallFontPreview') },
    { value: 'medium', label: t('mediumFont'), preview: t('mediumFontPreview') },
    { value: 'large', label: t('largeFont'), preview: t('largeFontPreview') }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('settings')}</h2>
            <p className="text-gray-500 mt-1">{t('settingsDescription')}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* 标签页 */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          {[
            { id: 'general', label: t('basicSettings'), icon: <SettingsIcon size={16} /> },
            { id: 'shortcuts', label: t('shortcuts'), icon: <Zap size={16} /> },
            { id: 'data', label: t('dataManagement'), icon: <Database size={16} /> },
            ...(isAIAvailable ? [{ id: 'ai', label: 'AI设置（实验功能）', icon: <Monitor size={16} /> }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* 主题设置 */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Palette size={20} />
                {t('themeSettings')}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {themeOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => saveSettings({ theme: option.value as Theme })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      settings.theme === option.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 justify-center mb-2">
                      {option.icon}
                      <span className="font-medium">{option.label}</span>
                    </div>
                    {settings.theme === option.value && (
                      <div className="text-xs text-primary-600">{t('currentTheme')}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 字体设置 */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Type size={20} />
                {t('fontSettings')}
              </h3>
              <div className="space-y-4">
                {fontSizeOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => saveSettings({ fontSize: option.value as FontSize })}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      settings.fontSize === option.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{option.label}</span>
                      {settings.fontSize === option.value && (
                        <div className="text-xs text-primary-600">{t('current')}</div>
                      )}
                    </div>
                    <div className={`mt-2 text-gray-600 ${
                      option.value === 'small' ? 'text-sm' :
                      option.value === 'large' ? 'text-lg' : 'text-base'
                    }`}>
                      {option.preview}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 语言设置 */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Globe size={20} />
                {t('languageSettings')}
              </h3>
              <div className="flex gap-4">
                {[
                  { value: 'zh', label: t('chinese') },
                  { value: 'en', label: 'English' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => saveSettings({ language: option.value as Language })}
                    className={`px-6 py-2 rounded-lg border-2 transition-all ${
                      settings.language === option.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 自动保存 */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('otherSettings')}</h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => saveSettings({ autoSave: e.target.checked })}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
                <div>
                  <div className="font-medium">{t('autoSave')}</div>
                  <div className="text-sm text-gray-500">{t('autoSaveDescription')}</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'shortcuts' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Zap size={20} />
                  {t('shortcutsSettings')}
                </h3>
                <button
                  onClick={resetShortcuts}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <RotateCcw size={16} />
                  {t('resetToDefault')}
                </button>
              </div>

              <div className="space-y-3">
                {shortcuts.map(shortcut => (
                  <div key={shortcut.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{getActionName(shortcut.action)}</div>
                      <div className="text-sm text-gray-500">{shortcut.action}</div>
                    </div>

                    {editingShortcut === shortcut.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={tempKeys}
                          onChange={(e) => setTempKeys(e.target.value)}
                          placeholder={t('shortcutExample')}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <button
                          onClick={() => saveShortcut(shortcut.id, { keys: tempKeys })}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          disabled={!tempKeys.trim()}
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingShortcut(null);
                            setTempKeys('');
                            setConflictError(null);
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <kbd className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-sm">
                          {shortcut.keys}
                        </kbd>
                        <button
                          onClick={() => {
                            setEditingShortcut(shortcut.id);
                            setTempKeys(shortcut.keys);
                            setConflictError(null);
                          }}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        >
                          {t('edit')}
                        </button>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={shortcut.enabled}
                            onChange={(e) => saveShortcut(shortcut.id, { enabled: e.target.checked })}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                          <span className="text-sm text-gray-600">{t('enable')}</span>
                        </label>
                      </div>
                    )}
                  </div>
                ))}

                {conflictError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {conflictError}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Download size={20} />
                {t('exportData')}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('exportFormat')}
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 'json', label: 'JSON' },
                      { value: 'markdown', label: 'Markdown' },
                      { value: 'txt', label: 'TXT' }
                    ].map(format => (
                      <button
                        key={format.value}
                        onClick={() => saveSettings({ exportFormat: format.value as ExportFormat })}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          settings.exportFormat === format.value
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {format.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={exportData}
                  className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Download size={20} />
                  {t('exportNoteData')}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border-2 border-red-200">
              <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                <Trash2 size={20} />
                {t('dangerousOperations')}
              </h3>
              <div className="text-sm text-red-600 mb-4">
                {t('dangerousOperationsWarning')}
              </div>
              <button
                onClick={() => {
                  showConfirm(
                    t('clearData'),
                    t('confirmClearData'),
                    async () => {
                      // 这里可以实现清空数据的逻辑
                      showError(t('featureInDevelopment'), t('clearDataFeatureComingSoon'));
                    }
                  );
                }}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {t('clearAllData')}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <SimpleAIWrapper
            fallback={
              <div className="text-center py-12">
                <Monitor size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">AI 功能已禁用</h3>
                <p className="text-gray-500 mb-4">
                  当前环境中 AI 功能已被禁用。要启用 AI 功能，请设置环境变量 VITE_AI_ENABLED=true 并重启应用。
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">启用 AI 功能</h4>
                  <code className="text-xs bg-blue-100 px-2 py-1 rounded">
                    VITE_AI_ENABLED=true
                  </code>
                  <p className="text-xs text-blue-600 mt-2">
                    设置后请重启开发服务器
                  </p>
                </div>
              </div>
            }
          >
            <EnhancedAISettings onClose={onClose} />
          </SimpleAIWrapper>
        )}
      </div>

      {/* 保存状态指示器 */}
      {settingsUpdating && (
        <div className="absolute top-4 right-4 px-4 py-2 bg-green-100 text-green-700 rounded-lg flex items-center gap-2">
          <RefreshCw size={16} className="animate-spin" />
          保存中...
        </div>
      )}
    </div>
  );
};

export default Settings;