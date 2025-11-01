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
  aiProvider?: 'openai' | 'claude' | 'mock';
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

// AI建议表接口
export interface DbAISuggestion {
  id?: number;
  noteId: string;
  relatedNotes: string; // JSON数组存储相关便签ID
  searchKeywords: string; // JSON数组存储语义关键词
  lastAnalyzed: Date;
  confidence: number;
  suggestionType: 'search' | 'relation' | 'reminder';
}

// AI提供商配置表
export interface DbAIProvider {
  id?: number;
  name: string;
  type: 'deepseek' | 'zhipu' | 'kimi' | 'custom';
  enabled: boolean;
  apiKey?: string; // 加密存储
  config?: string; // JSON字符串存储自定义配置
  selectedModel?: string; // 当前选择的模型
  createdAt: Date;
  updatedAt: Date;
  lastTested?: Date;
  testStatus?: 'success' | 'failed' | 'pending';
  testMessage?: string;
}

// AI模型使用记录表
export interface DbAIModelUsage {
  id?: number;
  providerId: number;
  modelId: string;
  useCase: 'search' | 'relation' | 'reminder' | 'general';
  requestCount: number;
  totalTokens: number;
  totalCost: number; // USD
  averageResponseTime: number; // 毫秒
  successRate: number; // 0-1
  lastUsed: Date;
  createdAt: Date;
  updatedAt: Date;
}

// AI模型缓存表
export interface DbAIModelCache {
  id?: number;
  providerId: number;
  modelId: string;
  modelData: string; // JSON字符串存储模型信息
  cachedAt: Date;
  expiresAt: Date;
}

class NoteReviveDB extends Dexie {
  notes!: Table<NoteType, string>;
  tags!: Table<Tag, string>;
  activities!: Table<ActivityRecord, string>;
  userPoints!: Table<UserPoints, number>;
  settings!: Table<DbSettings, number>;
  customShortcuts!: Table<DbCustomShortcut, string>;
  aiSuggestions!: Table<DbAISuggestion, number>;
  aiProviders!: Table<DbAIProvider, number>;
  aiModelUsage!: Table<DbAIModelUsage, number>;
  aiModelCache!: Table<DbAIModelCache, number>;

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

    this.version(3).stores({
      notes: 'id, createdAt, updatedAt, status, isPrivate, *tags',
      tags: 'id, name, createdAt',
      activities: 'id, type, timestamp',
      userPoints: 'id',
      settings: 'id, theme, fontSize, language',
      customShortcuts: 'id, action, enabled',
      aiSuggestions: '++id, noteId, suggestionType, lastAnalyzed'
    });

    this.version(4).stores({
      notes: 'id, createdAt, updatedAt, status, isPrivate, *tags',
      tags: 'id, name, createdAt',
      activities: 'id, type, timestamp',
      userPoints: 'id',
      settings: 'id, theme, fontSize, language',
      customShortcuts: 'id, action, enabled',
      aiSuggestions: '++id, noteId, suggestionType, lastAnalyzed',
      aiProviders: '++id, type, enabled, name, lastTested',
      aiModelUsage: '++id, providerId, modelId, useCase, lastUsed',
      aiModelCache: '++id, providerId, modelId, expiresAt'
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
export async function addPoints(points: number, type: ActivityRecord['type'], metadata?: Record<string, any>): Promise<{ leveledUp: boolean; newLevel: number }> {
  const userPoints = await db.userPoints.get(1);
  if (!userPoints) {
    await initUserPoints();
    return addPoints(points, type, metadata);
  }

  const oldLevel = userPoints.level;
  const newTotal = userPoints.totalPoints + points;
  const newLevel = calculateLevel(newTotal);
  const leveledUp = newLevel > oldLevel;

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

  return { leveledUp, newLevel };
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

// 检查智能回顾提醒
export async function checkReviewReminder(): Promise<boolean> {
  const userPoints = await db.userPoints.get(1);
  if (!userPoints) return false;

  const now = new Date();

  // 检查AI是否启用
  const settings = await getSettings();
  const aiEnabled = settings?.aiEnabled;

  if (aiEnabled) {
    // 使用AI智能推荐回顾内容
    try {
      const { getReviewSuggestions } = await import('./services/ai');
      const allNotes = await db.notes.toArray();
      const suggestedNotes = await getReviewSuggestions(allNotes);

      if (suggestedNotes.length > 0) {
        // 检查距离上次提醒是否超过6小时（AI推荐更频繁）
        if (!userPoints.lastReviewReminder ||
            (now.getTime() - userPoints.lastReviewReminder.getTime()) > 6 * 60 * 60 * 1000) {
          await db.userPoints.update(1, { lastReviewReminder: now });

          // 保存AI推荐的回顾便签到数据库
          await saveAISuggestion({
            noteId: suggestedNotes[0], // 保存最高优先级的推荐
            relatedNotes: JSON.stringify(suggestedNotes),
            searchKeywords: JSON.stringify([]),
            lastAnalyzed: now,
            confidence: 0.8,
            suggestionType: 'reminder'
          });

          return true;
        }
      }
    } catch (error) {
      console.warn('AI回顾推荐失败，使用传统方法:', error);
    }
  }

  // 传统回顾逻辑（作为降级方案）
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

// ==================== AI相关数据库操作 ====================

// 保存AI建议
export async function saveAISuggestion(suggestion: Omit<DbAISuggestion, 'id'>): Promise<number> {
  return await db.aiSuggestions.add(suggestion);
}

// 获取便签的AI建议
export async function getAISuggestion(noteId: string, suggestionType: 'search' | 'relation' | 'reminder'): Promise<DbAISuggestion | undefined> {
  return await db.aiSuggestions
    .where('noteId')
    .equals(noteId)
    .and(suggestion => suggestion.suggestionType === suggestionType)
    .first();
}

// 更新AI建议
export async function updateAISuggestion(id: number, updates: Partial<DbAISuggestion>): Promise<void> {
  await db.aiSuggestions.update(id, updates);
}

// 删除AI建议
export async function deleteAISuggestion(id: number): Promise<void> {
  await db.aiSuggestions.delete(id);
}

// 清理过期的AI建议（超过7天）
export async function cleanupOldAISuggestions(): Promise<void> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  await db.aiSuggestions
    .where('lastAnalyzed')
    .below(sevenDaysAgo)
    .delete();
}

// 获取所有相关的AI建议
export async function getRelatedAISuggestions(noteIds: string[]): Promise<DbAISuggestion[]> {
  return await db.aiSuggestions
    .where('noteId')
    .anyOf(noteIds)
    .toArray();
}

// 批量保存AI建议
export async function batchSaveAISuggestions(suggestions: Omit<DbAISuggestion, 'id'>[]): Promise<void> {
  await db.aiSuggestions.bulkAdd(suggestions);
}

// ==================== AI提供商数据库操作 ====================

// 初始化默认AI提供商
export async function initDefaultAIProviders(): Promise<void> {
  const existingProviders = await db.aiProviders.count();
  if (existingProviders === 0) {
    const defaultProviders: Omit<DbAIProvider, 'id'>[] = [
      {
        name: 'DeepSeek',
        type: 'deepseek',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '智谱AI',
        type: 'zhipu',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Kimi',
        type: 'kimi',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    await db.aiProviders.bulkAdd(defaultProviders);
  }
}

// 获取所有AI提供商
export async function getAIProviders(): Promise<DbAIProvider[]> {
  return await db.aiProviders.orderBy('createdAt').toArray();
}

// 获取启用的AI提供商
export async function getEnabledAIProviders(): Promise<DbAIProvider[]> {
  return await db.aiProviders.where('enabled').equals(true).toArray();
}

// 根据类型获取AI提供商
export async function getAIProviderByType(type: string): Promise<DbAIProvider | undefined> {
  return await db.aiProviders.where('type').equals(type as any).first();
}

// 根据ID获取AI提供商
export async function getAIProvider(id: number): Promise<DbAIProvider | undefined> {
  return await db.aiProviders.get(id);
}

// 添加AI提供商
export async function addAIProvider(provider: Omit<DbAIProvider, 'id'>): Promise<number> {
  return await db.aiProviders.add(provider);
}

// 更新AI提供商
export async function updateAIProvider(id: number, updates: Partial<DbAIProvider>): Promise<void> {
  await db.aiProviders.update(id, {
    ...updates,
    updatedAt: new Date()
  });
}

// 更新提供商测试状态
export async function updateProviderTestStatus(
  id: number,
  status: 'success' | 'failed' | 'pending',
  message?: string
): Promise<void> {
  await db.aiProviders.update(id, {
    testStatus: status,
    testMessage: message,
    lastTested: new Date(),
    updatedAt: new Date()
  });
}

// 删除AI提供商
export async function deleteAIProvider(id: number): Promise<void> {
  await db.aiProviders.delete(id);
  // 同时删除相关的使用记录和缓存
  await db.aiModelUsage.where('providerId').equals(id).delete();
  await db.aiModelCache.where('providerId').equals(id).delete();
}

// 切换提供商启用状态
export async function toggleAIProvider(id: number): Promise<void> {
  const provider = await db.aiProviders.get(id);
  if (provider) {
    await db.aiProviders.update(id, {
      enabled: !provider.enabled,
      updatedAt: new Date()
    });
  }
}

// ==================== AI模型使用记录操作 ====================

// 记录模型使用
export async function recordModelUsage(
  providerId: number,
  modelId: string,
  useCase: 'search' | 'relation' | 'reminder' | 'general',
  tokensUsed: number,
  cost: number,
  responseTime: number,
  success: boolean
): Promise<void> {
  const now = new Date();
  const existing = await db.aiModelUsage
    .where('providerId')
    .equals(providerId)
    .and(usage => usage.modelId === modelId && usage.useCase === useCase)
    .first();

  if (existing) {
    // 更新现有记录
    const totalRequests = existing.requestCount + 1;
    const totalTokens = existing.totalTokens + tokensUsed;
    const totalCost = existing.totalCost + cost;
    const successCount = existing.successRate * existing.requestCount + (success ? 1 : 0);

    await db.aiModelUsage.update(existing.id!, {
      requestCount: totalRequests,
      totalTokens,
      totalCost,
      averageResponseTime: (existing.averageResponseTime * existing.requestCount + responseTime) / totalRequests,
      successRate: successCount / totalRequests,
      lastUsed: now,
      updatedAt: now
    });
  } else {
    // 创建新记录
    await db.aiModelUsage.add({
      providerId,
      modelId,
      useCase,
      requestCount: 1,
      totalTokens: tokensUsed,
      totalCost: cost,
      averageResponseTime: responseTime,
      successRate: success ? 1 : 0,
      lastUsed: now,
      createdAt: now,
      updatedAt: now
    });
  }
}

// 获取模型使用统计
export async function getModelUsageStats(providerId?: number): Promise<DbAIModelUsage[]> {
  if (providerId) {
    return await db.aiModelUsage.where('providerId').equals(providerId).toArray();
  }
  return await db.aiModelUsage.orderBy('lastUsed').reverse().toArray();
}

// 获取最受欢迎的模型
export async function getMostPopularModels(limit: number = 5): Promise<Array<{
  modelId: string;
  totalUsage: number;
  averageCost: number;
}>> {
  const stats = await db.aiModelUsage.toArray();
  const modelStats = new Map<string, { usage: number; totalCost: number }>();

  for (const record of stats) {
    const existing = modelStats.get(record.modelId) || { usage: 0, totalCost: 0 };
    modelStats.set(record.modelId, {
      usage: existing.usage + record.requestCount,
      totalCost: existing.totalCost + record.totalCost
    });
  }

  return Array.from(modelStats.entries())
    .map(([modelId, stats]) => ({
      modelId,
      totalUsage: stats.usage,
      averageCost: stats.totalCost / stats.usage
    }))
    .sort((a, b) => b.totalUsage - a.totalUsage)
    .slice(0, limit);
}

// ==================== AI模型缓存操作 ====================

// 缓存模型数据
export async function cacheModelData(
  providerId: number,
  modelId: string,
  modelData: any,
  expiresInHours: number = 24
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

  // 删除现有缓存
  await db.aiModelCache
    .where('providerId')
    .equals(providerId)
    .and(cache => cache.modelId === modelId)
    .delete();

  // 添加新缓存
  await db.aiModelCache.add({
    providerId,
    modelId,
    modelData: JSON.stringify(modelData),
    cachedAt: now,
    expiresAt
  });
}

// 获取缓存的模型数据
export async function getCachedModelData(
  providerId: number,
  modelId: string
): Promise<any | null> {
  const cache = await db.aiModelCache
    .where('providerId')
    .equals(providerId)
    .and(cache => cache.modelId === modelId && cache.expiresAt > new Date())
    .first();

  if (cache) {
    try {
      return JSON.parse(cache.modelData);
    } catch (error) {
      console.warn('解析缓存的模型数据失败:', error);
      // 删除损坏的缓存
      await db.aiModelCache.delete(cache.id!);
    }
  }

  return null;
}

// 清理过期缓存
export async function cleanupExpiredModelCache(): Promise<void> {
  await db.aiModelCache.where('expiresAt').below(new Date()).delete();
}

// 清除特定提供商的缓存
export async function clearProviderModelCache(providerId: number): Promise<void> {
  await db.aiModelCache.where('providerId').equals(providerId).delete();
}

// ==================== AI配置迁移 ====================

// 从旧版本AI设置迁移到新的提供商系统
export async function migrateAISettings(): Promise<void> {
  const settings = await getSettings();
  if (settings.aiEnabled && settings.aiProvider && settings.aiApiKey) {
    // 查找对应的提供商
    let providerType: 'deepseek' | 'zhipu' | 'kimi' | 'custom' = 'custom';
    let providerName = settings.aiProvider;

    if (settings.aiProvider === 'openai') {
      providerType = 'custom';
      providerName = 'OpenAI';
    } else if (settings.aiProvider === 'claude') {
      providerType = 'custom';
      providerName = 'Claude';
    }

    // 检查是否已存在对应的提供商
    let provider = await getAIProviderByType(providerType);

    if (!provider) {
      // 创建新的提供商
      const providerId = await addAIProvider({
        name: providerName,
        type: providerType,
        enabled: true,
        apiKey: encryptContent(settings.aiApiKey),
        selectedModel: settings.aiModel,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      provider = await getAIProvider(providerId);
    } else {
      // 更新现有提供商
      await updateAIProvider(provider.id!, {
        enabled: true,
        apiKey: encryptContent(settings.aiApiKey),
        selectedModel: settings.aiModel
      });
    }

    // 清除旧的AI设置
    await updateSettings({
      aiEnabled: false,
      aiProvider: undefined,
      aiApiKey: undefined,
      aiModel: undefined
    });
  }
}

// 导出必要的类型和函数
export type { NoteType as Note };
export { getComboString } from './constants/shortcuts';
