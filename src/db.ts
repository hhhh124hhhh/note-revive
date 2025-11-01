import Dexie, { Table } from 'dexie';
import CryptoJS from 'crypto-js';
import {
  Tag,
  ActivityRecord,
  UserPoints,
  Achievement,
  Theme,
  FontSize,
  Language,
  ExportFormat,
  Note as NoteType
} from './types';

// 新增设置接口（如果需要直接在db.ts中使用）
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

export interface DbCustomShortcut {
  id: string;
  name: string;
  keys: string;
  action: string;
  enabled: boolean;
}

class NoteReviveDB extends Dexie {
  notes!: Table<NoteType, string>;
  tags!: Table<Tag, string>;
  activities!: Table<ActivityRecord, string>;
  userPoints!: Table<UserPoints, number>;
  settings!: Table<DbSettings, number>;
  customShortcuts!: Table<DbCustomShortcut, string>;

  constructor() {
    super('NoteReviveDB');

    this.version(1).stores({
      notes: 'id, createdAt, updatedAt, status, isPrivate, *tags',
      tags: 'id, name, createdAt',
      activities: 'id, type, timestamp',
      userPoints: 'id'
    });

    this.version(2).stores({
      notes: 'id, createdAt, updatedAt, status, isPrivate, *tags',
      tags: 'id, name, createdAt',
      activities: 'id, type, timestamp',
      userPoints: 'id',
      settings: 'id, theme, fontSize, language',
      customShortcuts: 'id, action, enabled'
    });
  }
}

export const db = new NoteReviveDB();

// 加密密钥（实际应用中应该让用户设置）
const ENCRYPTION_KEY = 'note-revive-secret-key-2025';

// 加密函数
export function encryptContent(content: string): string {
  return CryptoJS.AES.encrypt(content, ENCRYPTION_KEY).toString();
}

// 解密函数
export function decryptContent(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// 默认成就列表
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_note',
    name: '初次记录',
    description: '创建你的第一个便签',
    pointsReward: 10,
    criteria: 'notes_created >= 1',
    unlocked: false
  },
  {
    id: 'ten_notes',
    name: '记录达人',
    description: '创建10个便签',
    pointsReward: 50,
    criteria: 'notes_created >= 10',
    unlocked: false
  },
  {
    id: 'first_review',
    name: '首次回顾',
    description: '完成第一次便签回顾',
    pointsReward: 20,
    criteria: 'notes_reviewed >= 1',
    unlocked: false
  },
  {
    id: 'tag_master',
    name: '标签大师',
    description: '使用5个不同的标签',
    pointsReward: 30,
    criteria: 'unique_tags >= 5',
    unlocked: false
  },
  {
    id: 'week_streak',
    name: '连续记录',
    description: '连续7天记录便签',
    pointsReward: 100,
    criteria: 'streak_days >= 7',
    unlocked: false
  },
  {
    id: 'fifty_notes',
    name: '高产作家',
    description: '创建50个便签',
    pointsReward: 200,
    criteria: 'notes_created >= 50',
    unlocked: false
  }
];

// 初始化用户积分数据
export async function initUserPoints(): Promise<void> {
  const existing = await db.userPoints.get(1);
  if (!existing) {
    await db.userPoints.add({
      id: 1,
      totalPoints: 0,
      level: 1,
      unlockedAchievements: []
    });
  }
}

// 计算等级（每100积分升一级）
export function calculateLevel(points: number): number {
  return Math.floor(points / 100) + 1;
}

// 添加积分
export async function addPoints(points: number, type: ActivityRecord['type'], metadata?: Record<string, any>): Promise<void> {
  const userPoints = await db.userPoints.get(1);
  if (!userPoints) {
    await initUserPoints();
    return addPoints(points, type, metadata);
  }

  const newTotal = userPoints.totalPoints + points;
  const newLevel = calculateLevel(newTotal);

  await db.userPoints.update(1, {
    totalPoints: newTotal,
    level: newLevel
  });

  await db.activities.add({
    id: `activity-${Date.now()}-${Math.random()}`,
    type,
    points,
    timestamp: new Date(),
    metadata
  });
}

// 检查并解锁成就
export async function checkAchievements(): Promise<string[]> {
  const userPoints = await db.userPoints.get(1);
  if (!userPoints) return [];

  const notesCount = await db.notes.count();
  const reviewedCount = await db.notes.where('status').equals('reviewed').count();
  const allNotes = await db.notes.toArray();
  const uniqueTags = new Set(allNotes.flatMap(n => n.tags));

  const newUnlocked: string[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (userPoints.unlockedAchievements.includes(achievement.id)) continue;

    let shouldUnlock = false;

    if (achievement.id === 'first_note' && notesCount >= 1) shouldUnlock = true;
    if (achievement.id === 'ten_notes' && notesCount >= 10) shouldUnlock = true;
    if (achievement.id === 'fifty_notes' && notesCount >= 50) shouldUnlock = true;
    if (achievement.id === 'first_review' && reviewedCount >= 1) shouldUnlock = true;
    if (achievement.id === 'tag_master' && uniqueTags.size >= 5) shouldUnlock = true;

    if (shouldUnlock) {
      newUnlocked.push(achievement.id);
      await db.userPoints.update(1, {
        unlockedAchievements: [...userPoints.unlockedAchievements, achievement.id]
      });
      await addPoints(achievement.pointsReward, 'achievement_unlocked', { achievementId: achievement.id });
    }
  }

  return newUnlocked;
}

// 检查是否需要回顾提醒
export async function checkReviewReminder(): Promise<boolean> {
  const userPoints = await db.userPoints.get(1);
  if (!userPoints) return false;

  const now = new Date();

  // 检查是否有超过7天未回顾的便签
  const oldNotes = await db.notes
    .where('status')
    .notEqual('reviewed')
    .and(note => {
      const daysSinceCreated = (now.getTime() - note.createdAt.getTime()) / (24 * 60 * 60 * 1000);
      return daysSinceCreated > 7;
    })
    .count();

  // 如果有旧便签且距离上次提醒超过1天
  if (oldNotes > 0) {
    if (!userPoints.lastReviewReminder || 
        (now.getTime() - userPoints.lastReviewReminder.getTime()) > 24 * 60 * 60 * 1000) {
      await db.userPoints.update(1, { lastReviewReminder: now });
      return true;
    }
  }

  return false;
}

// ========== 设置相关函数 ==========

// 初始化默认设置
export async function initDefaultSettings(): Promise<void> {
  const existing = await db.settings.get(1);
  if (!existing) {
    await db.settings.add({
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
}

// 获取设置
export async function getSettings(): Promise<DbSettings> {
  const settings = await db.settings.get(1);
  if (!settings) {
    await initDefaultSettings();
    return (await db.settings.get(1))!;
  }
  return settings;
}

// 更新设置
export async function updateSettings(updates: Partial<DbSettings>): Promise<void> {
  await db.settings.update(1, {
    ...updates,
    updatedAt: new Date()
  });
}

// 初始化默认快捷键
export async function initDefaultShortcuts(): Promise<void> {
  const existingCount = await db.customShortcuts.count();
  if (existingCount === 0) {
    const defaultShortcuts: DbCustomShortcut[] = [
      { id: 'default-toggleShortcuts', name: '打开快捷面板', keys: 'Ctrl+K', action: 'toggleShortcuts', enabled: true },
      { id: 'default-newNote', name: '新建便签', keys: 'Ctrl+N', action: 'newNote', enabled: true },
      { id: 'default-search', name: '快速搜索', keys: 'Ctrl+F', action: 'search', enabled: true },
      { id: 'default-save', name: '保存便签', keys: 'Ctrl+S', action: 'save', enabled: true },
      { id: 'default-settings', name: '打开设置', keys: 'Ctrl+,', action: 'settings', enabled: true },
      { id: 'default-toggleTheme', name: '切换主题', keys: 'Ctrl+Shift+T', action: 'toggleTheme', enabled: true },
      { id: 'default-exportData', name: '导出数据', keys: 'Ctrl+Shift+E', action: 'exportData', enabled: true },
      { id: 'default-focusSearch', name: '聚焦搜索框', keys: 'Ctrl+Shift+F', action: 'focusSearch', enabled: true }
    ];
    await db.customShortcuts.bulkAdd(defaultShortcuts);
  }
}

// 获取所有快捷键
export async function getShortcuts(): Promise<DbCustomShortcut[]> {
  return await db.customShortcuts.toArray();
}

// 更新快捷键
export async function updateShortcut(id: string, updates: Partial<DbCustomShortcut>): Promise<void> {
  await db.customShortcuts.update(id, updates);
}

// 重置快捷键为默认
export async function resetShortcutsToDefault(): Promise<void> {
  await db.customShortcuts.clear();
  await initDefaultShortcuts();
}

// 检查快捷键冲突
export async function checkShortcutConflict(keys: string, excludeId?: string): Promise<boolean> {
  const existing = await db.customShortcuts
    .where('keys')
    .equals(keys)
    .and(shortcut => shortcut.enabled)
    .toArray();

  return existing.some(shortcut => shortcut.id !== excludeId);
}

// 导出必要的类型和函数
export type { NoteType as Note };
export { getComboString } from './constants/shortcuts';
