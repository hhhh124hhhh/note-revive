import Dexie, { Table } from 'dexie';
import CryptoJS from 'crypto-js';

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

class NoteReviveDB extends Dexie {
  notes!: Table<Note, string>;
  tags!: Table<Tag, string>;
  activities!: Table<ActivityRecord, string>;
  userPoints!: Table<UserPoints, number>;

  constructor() {
    super('NoteReviveDB');
    
    this.version(1).stores({
      notes: 'id, createdAt, updatedAt, status, isPrivate, *tags',
      tags: 'id, name, createdAt',
      activities: 'id, type, timestamp',
      userPoints: 'id'
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
