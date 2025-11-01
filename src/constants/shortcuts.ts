
export const DEFAULT_SHORTCUTS = {
  'toggleShortcuts': 'Ctrl+K',
  'newNote': 'Ctrl+N',
  'search': 'Ctrl+F',
  'save': 'Ctrl+S',
  'settings': 'Ctrl+,',
  'toggleTheme': 'Ctrl+Shift+T',
  'exportData': 'Ctrl+Shift+E',
  'focusSearch': 'Ctrl+Shift+F'
} as const;

export const SHORTCUT_ACTIONS = {
  'toggleShortcuts': '打开快捷面板',
  'newNote': '新建便签',
  'search': '快速搜索',
  'save': '保存便签',
  'settings': '打开设置',
  'toggleTheme': '切换主题',
  'exportData': '导出数据',
  'focusSearch': '聚焦搜索框'
} as const;

export const getComboString = (event: KeyboardEvent): string => {
  const parts: string[] = [];

  if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
  if (event.shiftKey) parts.push('Shift');
  if (event.altKey) parts.push('Alt');

  if (event.key && !['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) {
    parts.push(event.key.toUpperCase());
  }

  return parts.join('+');
};

// 主题颜色配置
export const THEMES = {
  light: {
    name: '亮色主题',
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    }
  },
  dark: {
    name: '暗色主题',
    primary: {
      50: '#1e293b',
      100: '#334155',
      200: '#475569',
      300: '#64748b',
      400: '#94a3b8',
      500: '#cbd5e1',
      600: '#e2e8f0',
      700: '#f1f5f9',
      800: '#f8fafc',
      900: '#ffffff',
    }
  },
  blue: {
    name: '蓝色主题',
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    }
  },
  green: {
    name: '绿色主题',
    primary: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    }
  },
  purple: {
    name: '紫色主题',
    primary: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87',
    }
  },
  orange: {
    name: '橙色主题',
    primary: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    }
  }
} as const;