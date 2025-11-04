// 数据库架构重构版本
// 核心数据库和AI数据库完全分离，提供更好的稳定性和性能

// 导出数据库实例
export { coreDb } from './core-db';
export { aiDb } from './ai-db';
export { databaseManager } from './database-manager';

// 导出类型定义
export type {
  CoreSettings,
  CustomShortcut
} from './core-db';

export type {
  AISuggestion,
  AIProvider as DbAIProvider,
  AIModelUsage as DbAIModelUsage,
  AIModelCache
} from './ai-db';

// 导出数据库操作函数
export {
  // 核心数据库
  getSettings,
  updateSettings,
  getShortcuts as getCustomShortcuts,
  updateShortcut as updateCustomShortcut,
  initUserPoints,
  initDefaultSettings,
  initDefaultShortcuts,
  addPoints,
  checkAchievements,
  checkReviewReminder,
  encryptContent,
  decryptContent,
  
  // AI数据库
  getAIProviders,
  getEnabledAIProviders,
  getAIProviderByType,
  getAIProvider,
  addAIProvider,
  updateAIProvider,
  deleteAIProvider,
  toggleAIProvider,
  updateProviderTestStatus,
  initDefaultAIProviders,
  recordModelUsage,
  getModelUsageStats,
  getMostPopularModels,
  migrateAISettings
} from '../db';

// 向后兼容的导出（保持原有API兼容性）
export { NoteReviveCoreDB } from './core-db';
export { NoteReviveAIDB } from './ai-db';

// 为了向后兼容，保持一些原有的类型导出
export type {
  Note as NoteType,
  Tag,
  ActivityRecord,
  UserPoints,
  Achievement,
  Theme,
  FontSize,
  Language,
  ExportFormat
} from '../types';

// 重新导出数据库管理器类
export { DatabaseManager } from './database-manager';