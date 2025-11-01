import { useEffect, useState, useCallback } from 'react';
import { DbCustomShortcut, ShortcutsState, ShortcutItem } from '../types';
import { getShortcuts, getComboString } from '../db';
import { DEFAULT_SHORTCUTS, SHORTCUT_ACTIONS } from '../constants/shortcuts';

interface UseShortcutsOptions {
  onAction?: (action: string) => void;
  onToggleShortcuts?: () => void;
  onNewNote?: () => void;
  onSearch?: () => void;
  onSave?: () => void;
  onSettings?: () => void;
  onToggleTheme?: () => void;
  onExportData?: () => void;
  onFocusSearch?: () => void;
}

export const useShortcuts = (options: UseShortcutsOptions = {}) => {
  const [shortcuts, setShortcuts] = useState<DbCustomShortcut[]>([]);
  const [shortcutsState, setShortcutsState] = useState<ShortcutsState>({
    isOpen: false,
    searchQuery: '',
    selectedIndex: 0,
    filteredItems: []
  });

  // 加载快捷键设置
  useEffect(() => {
    const loadShortcuts = async () => {
      try {
        const customShortcuts = await getShortcuts();
        setShortcuts(customShortcuts);
      } catch (error) {
        console.error('加载快捷键失败:', error);
      }
    };

    loadShortcuts();
  }, []);

  // 执行动作
  const executeAction = useCallback((action: string) => {
    switch (action) {
      case 'toggleShortcuts':
        options.onToggleShortcuts?.();
        break;
      case 'newNote':
        options.onNewNote?.();
        break;
      case 'search':
        options.onSearch?.();
        break;
      case 'save':
        options.onSave?.();
        break;
      case 'settings':
        options.onSettings?.();
        break;
      case 'toggleTheme':
        options.onToggleTheme?.();
        break;
      case 'exportData':
        options.onExportData?.();
        break;
      case 'focusSearch':
        options.onFocusSearch?.();
        break;
      default:
        options.onAction?.(action);
        break;
    }
  }, [options]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 如果在输入框中，不触发快捷键（除Ctrl+K外）
      const activeElement = document.activeElement as HTMLElement;
      const isInputElement = activeElement?.tagName === 'INPUT' ||
                            activeElement?.tagName === 'TEXTAREA' ||
                            activeElement?.contentEditable === 'true';

      const combo = getComboString(event);

      // 检查是否匹配自定义快捷键
      const matchedShortcut = shortcuts.find(shortcut =>
        shortcut.enabled && shortcut.keys === combo
      );

      if (matchedShortcut) {
        // Ctrl+K 可以在输入框中触发
        if (isInputElement && combo !== 'Ctrl+K') {
          return;
        }

        event.preventDefault();
        executeAction(matchedShortcut.action);
        return;
      }

      // 检查默认快捷键（作为备选）
      Object.entries(DEFAULT_SHORTCUTS).forEach(([action, keys]) => {
        if (keys === combo) {
          // Ctrl+K 可以在输入框中触发
          if (isInputElement && combo !== 'Ctrl+K') {
            return;
          }

          event.preventDefault();
          executeAction(action);
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, executeAction]);

  // 打开快捷面板
  const openShortcutsPanel = useCallback(() => {
    setShortcutsState({
      isOpen: true,
      searchQuery: '',
      selectedIndex: 0,
      filteredItems: []
    });
  }, []);

  // 关闭快捷面板
  const closeShortcutsPanel = useCallback(() => {
    setShortcutsState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // 生成快捷面板选项
  const generateShortcutItems = useCallback((): ShortcutItem[] => {
    const items: ShortcutItem[] = [];

    // 添加便签相关的快捷选项
    items.push({
      id: 'new-note',
      type: 'action',
      title: '新建便签',
      description: '创建一个新的便签',
      icon: null, // 会在组件中设置
      action: () => executeAction('newNote'),
      keywords: ['新建', '便签', '创建', 'note']
    });

    // 搜索相关的快捷选项
    items.push({
      id: 'search-notes',
      type: 'action',
      title: '搜索便签',
      description: '搜索现有便签',
      icon: null,
      action: () => executeAction('search'),
      keywords: ['搜索', '查找', 'search']
    });

    // 设置选项
    items.push({
      id: 'open-settings',
      type: 'action',
      title: '打开设置',
      description: '打开应用设置',
      icon: null,
      action: () => executeAction('settings'),
      keywords: ['设置', '配置', 'settings']
    });

    // 主题切换
    items.push({
      id: 'toggle-theme',
      type: 'action',
      title: '切换主题',
      description: '切换应用主题',
      icon: null,
      action: () => executeAction('toggleTheme'),
      keywords: ['主题', '切换', 'theme']
    });

    // 导出数据
    items.push({
      id: 'export-data',
      type: 'action',
      title: '导出数据',
      description: '导出便签数据',
      icon: null,
      action: () => executeAction('exportData'),
      keywords: ['导出', '备份', 'export']
    });

    return items;
  }, [executeAction]);

  // 搜索快捷选项
  const searchShortcuts = useCallback((query: string) => {
    const allItems = generateShortcutItems();

    if (!query.trim()) {
      return allItems;
    }

    const lowerQuery = query.toLowerCase();
    return allItems.filter(item =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description?.toLowerCase().includes(lowerQuery) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
    );
  }, [generateShortcutItems]);

  // 处理快捷面板搜索
  const handleShortcutsSearch = useCallback((query: string) => {
    const filtered = searchShortcuts(query);
    setShortcutsState(prev => ({
      ...prev,
      searchQuery: query,
      filteredItems: filtered,
      selectedIndex: 0
    }));
  }, [searchShortcuts]);

  // 选择快捷选项
  const selectShortcutItem = useCallback((index?: number) => {
    const items = shortcutsState.filteredItems.length > 0
      ? shortcutsState.filteredItems
      : generateShortcutItems();

    const targetIndex = index !== undefined ? index : shortcutsState.selectedIndex;
    const item = items[targetIndex];

    if (item) {
      item.action();
      closeShortcutsPanel();
    }
  }, [shortcutsState.filteredItems, shortcutsState.selectedIndex, generateShortcutItems, closeShortcutsPanel]);

  // 键盘导航
  const handleShortcutsKeyDown = useCallback((event: React.KeyboardEvent) => {
    const items = shortcutsState.filteredItems.length > 0
      ? shortcutsState.filteredItems
      : generateShortcutItems();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setShortcutsState(prev => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, items.length - 1)
        }));
        break;

      case 'ArrowUp':
        event.preventDefault();
        setShortcutsState(prev => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0)
        }));
        break;

      case 'Enter':
        event.preventDefault();
        selectShortcutItem();
        break;

      case 'Escape':
        event.preventDefault();
        closeShortcutsPanel();
        break;
    }
  }, [shortcutsState.filteredItems, generateShortcutItems, selectShortcutItem, closeShortcutsPanel]);

  return {
    // 快捷键状态
    shortcuts,
    shortcutsState,

    // 快捷面板控制
    openShortcutsPanel,
    closeShortcutsPanel,
    handleShortcutsSearch,
    handleShortcutsKeyDown,
    selectShortcutItem,

    // 工具函数
    getShortcutKeys: (action: string) => {
      const shortcut = shortcuts.find(s => s.action === action && s.enabled);
      return shortcut?.keys || DEFAULT_SHORTCUTS[action as keyof typeof DEFAULT_SHORTCUTS] || '';
    },

    getActionName: (action: string) => {
      const shortcut = shortcuts.find(s => s.action === action);
      return shortcut?.name || (SHORTCUT_ACTIONS[action as keyof typeof SHORTCUT_ACTIONS] ? SHORTCUT_ACTIONS[action as keyof typeof SHORTCUT_ACTIONS]() : action);
    }
  };
};