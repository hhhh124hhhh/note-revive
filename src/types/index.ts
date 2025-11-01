export interface Note {
  id?: string;
  content: string;
  tags: string[];
  isPrivate: boolean;
  status: 'draft' | 'saved' | 'reviewed' | 'reused';
  createdAt: Date;
  updatedAt: Date;
  lastReviewedAt?: Date;
  pointsAwarded?: number;
}

export interface Tag {
  id?: string;
  name: string;
  color: string;
  createdAt: Date;
}

export interface ActivityRecord {
  id?: string;
  type: 'note_created' | 'note_reviewed' | 'note_reused' | 'achievement_unlocked';
  points: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface UserPoints {
  id: number;
  totalPoints: number;
  level: number;
  unlockedAchievements: string[];
  lastReviewReminder?: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  pointsReward: number;
  criteria: string;
  unlocked: boolean;
}

// 新增设置相关接口
export type View = 'home' | 'search' | 'tags' | 'achievements' | 'editor' | 'settings' | 'view';
export type Theme = 'light' | 'dark' | 'blue' | 'green' | 'purple' | 'orange';
export type FontSize = 'small' | 'medium' | 'large';
export type Language = 'zh' | 'en';
export type ExportFormat = 'json' | 'markdown' | 'txt';

export interface AppSettings {
  id: number;
  theme: Theme;
  fontSize: FontSize;
  autoSave: boolean;
  language: Language;
  exportFormat: ExportFormat;
  aiEnabled: boolean;
  aiProvider?: 'openai' | 'claude' | 'custom';
  aiApiKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 数据库使用的设置接口
export interface DbSettings {
  id: number;
  theme: Theme;
  fontSize: FontSize;
  autoSave: boolean;
  language: Language;
  exportFormat: ExportFormat;
  aiEnabled: boolean;
  aiProvider?: 'openai' | 'claude' | 'custom';
  aiApiKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomShortcut {
  id: string;
  name: string;
  keys: string;
  action: string;
  enabled: boolean;
}

// 数据库使用的快捷键接口
export interface DbCustomShortcut {
  id: string;
  name: string;
  keys: string;
  action: string;
  enabled: boolean;
}

// 快捷方式相关接口
export type ShortcutsPanelState = 'closed' | 'open';

export interface ShortcutItem {
  id: string;
  type: 'action' | 'note' | 'tag' | 'command';
  title: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
}

export interface ShortcutsState {
  isOpen: boolean;
  searchQuery: string;
  selectedIndex: number;
  filteredItems: ShortcutItem[];
}

// 编辑器相关接口
export type EditorMode = 'edit' | 'preview' | 'split';

export interface EditingNote {
  content: string;
  tags: string[];
  isPrivate: boolean;
  status: 'draft' | 'saved' | 'reviewed' | 'reused';
}