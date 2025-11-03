import Dexie, { Table } from 'dexie';
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
} from '../types';

// 核心设置接口
export interface CoreSettings {
  id: number;
  theme: Theme;
  fontSize: FontSize;
  autoSave: boolean;
  language: Language;
  exportFormat: ExportFormat;
  aiEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 自定义快捷键接口
export interface CustomShortcut {
  id: string;
  name: string;
  keys: string;
  action: string;
  enabled: boolean;
}

/**
 * Note Revive 核心数据库
 * 只包含便签、标签、设置等核心功能，与AI功能完全分离
 */
export class NoteReviveCoreDB extends Dexie {
  // 核心业务表
  notes!: Table<NoteType, string>;
  tags!: Table<Tag, string>;
  activities!: Table<ActivityRecord, string>;
  userPoints!: Table<UserPoints, number>;
  settings!: Table<CoreSettings, number>;
  customShortcuts!: Table<CustomShortcut, string>;

  constructor() {
    super('NoteReviveCoreDB');

    // 语义化版本管理 - 核心数据库版本
    const CORE_DB_VERSIONS = {
      V1_CORE: 1,        // 基础便签功能
      V2_TAGS: 2,        // 标签系统
      V3_SETTINGS: 3,    // 设置和快捷键
      V4_OPTIMIZED: 4    // 性能优化和稳定性
    };

    // 版本1：基础便签功能
    this.version(CORE_DB_VERSIONS.V1_CORE).stores({
      notes: 'id, createdAt, updatedAt, status, isPrivate, *tags',
      tags: 'id, name, createdAt',
      activities: 'id, type, timestamp',
      userPoints: 'id'
    });

    // 版本2：添加标签系统
    this.version(CORE_DB_VERSIONS.V2_TAGS).stores({
      notes: 'id, createdAt, updatedAt, status, isPrivate, *tags',
      tags: 'id, name, createdAt',
      activities: 'id, type, timestamp',
      userPoints: 'id'
    }).upgrade(async tx => {
      console.log('🔄 核心数据库升级到版本2：优化标签系统...');
      // 标签相关的数据迁移逻辑
    });

    // 版本3：添加设置和快捷键
    this.version(CORE_DB_VERSIONS.V3_SETTINGS).stores({
      notes: 'id, createdAt, updatedAt, status, isPrivate, *tags',
      tags: 'id, name, createdAt',
      activities: 'id, type, timestamp',
      userPoints: 'id',
      settings: 'id, theme, fontSize, autoSave, language, exportFormat, aiEnabled',
      customShortcuts: 'id, action, enabled'
    }).upgrade(async tx => {
      console.log('🔄 核心数据库升级到版本3：添加设置和快捷键...');
      await this.initDefaultCoreSettings();
      await this.initDefaultShortcuts();
    });

    // 版本4：性能优化和稳定性
    this.version(CORE_DB_VERSIONS.V4_OPTIMIZED).stores({
      notes: 'id, createdAt, updatedAt, status, isPrivate, *tags, [createdAt+status]',
      tags: 'id, name, createdAt, [name]',
      activities: 'id, type, timestamp, [type+timestamp]',
      userPoints: 'id',
      settings: 'id, theme, fontSize, autoSave, language, exportFormat, aiEnabled, [id]',
      customShortcuts: 'id, action, enabled, [keys]'
    }).upgrade(async tx => {
      console.log('🔄 核心数据库升级到版本4：性能优化...');
      await this.validateAndCleanCoreData(tx);
    });

    // 错误处理
    this.open().catch(async error => {
      console.error('🚨 核心数据库打开失败:', error);

      const errorInfo = this.classifyError(error);
      if (errorInfo.canAutoRecover) {
        try {
          await this.attemptAutoRecovery(errorInfo);
          console.log('✅ 核心数据库自动恢复成功');
        } catch (recoveryError) {
          console.error('❌ 核心数据库自动恢复失败:', recoveryError);
          throw error;
        }
      } else {
        throw error;
      }
    });
  }

  // 初始化默认设置
  private async initDefaultCoreSettings(): Promise<void> {
    const existing = await this.settings.get(1);
    if (!existing) {
      await this.settings.add({
        id: 1,
        theme: 'light' as Theme,
        fontSize: 'medium' as FontSize,
        autoSave: true,
        language: 'zh' as Language,
        exportFormat: 'json' as ExportFormat,
        aiEnabled: false, // 核心数据库只记录是否启用AI，不存储具体配置
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  // 初始化默认快捷键
  private async initDefaultShortcuts(): Promise<void> {
    const existingCount = await this.customShortcuts.count();
    if (existingCount === 0) {
      const defaultShortcuts: CustomShortcut[] = [
        { id: 'default-newNote', name: '新建便签', keys: 'Ctrl+N', action: 'newNote', enabled: true },
        { id: 'default-search', name: '快速搜索', keys: 'Ctrl+F', action: 'search', enabled: true },
        { id: 'default-save', name: '保存便签', keys: 'Ctrl+S', action: 'save', enabled: true },
        { id: 'default-settings', name: '打开设置', keys: 'Ctrl+,', action: 'settings', enabled: true },
        { id: 'default-toggleTheme', name: '切换主题', keys: 'Ctrl+Shift+T', action: 'toggleTheme', enabled: true },
        { id: 'default-exportData', name: '导出数据', keys: 'Ctrl+Shift+E', action: 'exportData', enabled: true }
      ];
      await this.customShortcuts.bulkAdd(defaultShortcuts);
    }
  }

  // 数据验证和清理
  private async validateAndCleanCoreData(tx: any): Promise<void> {
    console.log('🔍 验证核心数据完整性...');

    // 验证便签数据
    const notes = await tx.table('notes').toArray();
    for (const note of notes) {
      if (!note.id || !note.createdAt) {
        console.warn('发现无效的便签记录:', note);
        await tx.table('notes').delete(note.id);
      }
    }

    // 验证标签数据
    const tags = await tx.table('tags').toArray();
    for (const tag of tags) {
      if (!tag.id || !tag.name) {
        console.warn('发现无效的标签记录:', tag);
        await tx.table('tags').delete(tag.id);
      }
    }

    console.log('✅ 核心数据验证完成');
  }

  // 错误分类
  private classifyError(error: any): { canAutoRecover: boolean; type: string } {
    if (error.name === 'QuotaExceededError') {
      return { canAutoRecover: true, type: 'QUOTA_ERROR' };
    }
    return { canAutoRecover: false, type: 'OTHER_ERROR' };
  }

  // 自动恢复
  private async attemptAutoRecovery(errorInfo: any): Promise<void> {
    if (errorInfo.type === 'QUOTA_ERROR') {
      console.log('🧹 清理核心数据库...');
      // 清理旧的活动记录
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await this.activities
        .where('timestamp')
        .below(thirtyDaysAgo)
        .delete();
    }
  }
}

// 创建核心数据库实例
export const coreDb = new NoteReviveCoreDB();