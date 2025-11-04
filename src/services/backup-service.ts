import { databaseManager } from '../db/database-manager';
import { Note as NoteType } from '../types';

// 备份文件接口
export interface BackupFile {
  metadata: {
    version: string;
    timestamp: string;
    noteCount: number;
    tagCount: number;
    settingsCount: number;
    aiProvidersCount: number;
    aiSuggestionsCount: number;
    totalSize: number;
    checksum: string;
  };
  data: {
    core: {
      notes: NoteType[];
      tags: any[];
      settings: any[];
      activities: any[];
      customShortcuts: any[];
    };
    ai: {
      providers: any[];
      suggestions: any[];
      usage: any[];
      cache: any[];
    };
  };
}

// 备份配置接口
export interface BackupConfig {
  includeAI: boolean;
  includeActivities: boolean;
  maxNotes: number;
  maxSuggestions: number;
  compress: boolean;
}

/**
 * 数据备份和恢复服务
 * 提供完整的数据备份、恢复、验证功能
 */
export class BackupService {
  private static instance: BackupService;

  private constructor() {}

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * 创建数据备份
   */
  async createBackup(config: Partial<BackupConfig> = {}): Promise<BackupFile> {
    const defaultConfig: BackupConfig = {
      includeAI: true,
      includeActivities: true,
      maxNotes: 10000,
      maxSuggestions: 1000,
      compress: false
    };

    const finalConfig = { ...defaultConfig, ...config };

    console.log('🔄 开始创建数据备份...');

    try {
      // 从数据库管理器获取数据
      const backup = await databaseManager.createBackup();

      // 根据配置过滤数据
      if (finalConfig.maxNotes && backup.core.notes.length > finalConfig.maxNotes) {
        backup.core.notes = backup.core.notes.slice(0, finalConfig.maxNotes);
      }

      if (finalConfig.maxSuggestions && backup.ai.suggestions.length > finalConfig.maxSuggestions) {
        backup.ai.suggestions = backup.ai.suggestions.slice(0, finalConfig.maxSuggestions);
      }

      // 计算元数据
      const metadata = {
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        noteCount: backup.core.notes.length,
        tagCount: backup.core.tags.length,
        settingsCount: backup.core.settings.length,
        aiProvidersCount: backup.ai.providers.length,
        aiSuggestionsCount: backup.ai.suggestions.length,
        totalSize: this.calculateDataSize(backup),
        checksum: await this.calculateChecksum(backup)
      };

      const backupFile: BackupFile = {
        metadata,
        data: backup
      };

      console.log('✅ 数据备份创建成功:', {
        notes: metadata.noteCount,
        tags: metadata.tagCount,
        aiProviders: metadata.aiProvidersCount,
        suggestions: metadata.aiSuggestionsCount,
        size: `${(metadata.totalSize / 1024 / 1024).toFixed(2)}MB`
      });

      return backupFile;
    } catch (error) {
      console.error('❌ 创建备份失败:', error);
      throw new Error(`备份创建失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 保存备份到文件
   */
  async saveBackupToFile(backupFile: BackupFile, filename?: string): Promise<string> {
    const defaultFilename = `note-revive-backup-${new Date().toISOString().split('T')[0]}.json`;
    const finalFilename = filename || defaultFilename;

    try {
      // 创建下载链接
      const blob = new Blob([JSON.stringify(backupFile, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('✅ 备份文件保存成功:', finalFilename);
      return finalFilename;
    } catch (error) {
      console.error('❌ 保存备份文件失败:', error);
      throw new Error(`保存备份失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 从文件加载备份
   */
  async loadBackupFromFile(file: File): Promise<BackupFile> {
    try {
      const text = await file.text();
      const backupFile = JSON.parse(text) as BackupFile;

      // 验证备份文件格式
      const validation = this.validateBackupFile(backupFile);
      if (!validation.isValid) {
        throw new Error(`备份文件验证失败: ${validation.errors.join(', ')}`);
      }

      console.log('✅ 备份文件加载成功:', {
        version: backupFile.metadata.version,
        timestamp: backupFile.metadata.timestamp,
        notes: backupFile.metadata.noteCount,
        tags: backupFile.metadata.tagCount
      });

      return backupFile;
    } catch (error) {
      console.error('❌ 加载备份文件失败:', error);
      throw new Error(`加载备份失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 恢复数据
   */
  async restoreFromBackup(backupFile: BackupFile, options: {
    overwriteExisting?: boolean;
    restoreAI?: boolean;
    restoreSettings?: boolean;
  } = {}): Promise<{
    success: boolean;
    message: string;
    details: any;
  }> {
    const {
      overwriteExisting = false,
      restoreAI = true,
      restoreSettings = true
    } = options;

    console.log('🔄 开始数据恢复...');

    try {
      // 创建当前数据的备份（用于回滚）
      const currentBackup = overwriteExisting ? await this.createBackup() : null;

      // 执行数据恢复
      await databaseManager.restoreFromBackup(backupFile.data);

      const result = {
        success: true,
        message: '数据恢复成功',
        details: {
          notesRestored: backupFile.metadata.noteCount,
          tagsRestored: backupFile.metadata.tagCount,
          aiRestored: restoreAI ? backupFile.metadata.aiProvidersCount : 0,
          backupSaved: !!currentBackup
        }
      };

      console.log('✅ 数据恢复完成:', result.details);
      return result;
    } catch (error) {
      console.error('❌ 数据恢复失败:', error);

      return {
        success: false,
        message: `数据恢复失败: ${error instanceof Error ? error.message : String(error)}`,
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * 验证备份文件
   */
  validateBackupFile(backupFile: any): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基本结构检查
    if (!backupFile.metadata) {
      errors.push('缺少元数据信息');
    }

    if (!backupFile.data) {
      errors.push('缺少备份数据');
    }

    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    // 数据完整性检查
    const { metadata, data } = backupFile;

    if (!metadata.version) {
      errors.push('缺少版本信息');
    }

    if (!metadata.timestamp) {
      errors.push('缺少时间戳');
    }

    if (!data.core || !data.ai) {
      errors.push('备份数据结构不完整');
    }

    // 数据一致性检查
    if (metadata.noteCount !== data.core.notes?.length) {
      warnings.push('便签数量与元数据不符');
    }

    if (metadata.tagCount !== data.core.tags?.length) {
      warnings.push('标签数量与元数据不符');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 自动备份
   */
  async createAutoBackup(): Promise<void> {
    try {
      const backup = await this.createBackup({
        includeAI: true,
        includeActivities: false, // 自动备份不包括活动记录
        maxNotes: 5000,
        maxSuggestions: 500
      });

      // 保存到localStorage（小规模备份）
      const compressed = this.compressBackup(backup);
      localStorage.setItem('note_revive_auto_backup', JSON.stringify(compressed));

      console.log('✅ 自动备份创建成功');
    } catch (error) {
      console.error('❌ 自动备份失败:', error);
      // 自动备份失败不应该影响主流程
    }
  }

  /**
   * 恢复自动备份
   */
  async restoreFromAutoBackup(): Promise<boolean> {
    try {
      const stored = localStorage.getItem('note_revive_auto_backup');
      if (!stored) {
        return false;
      }

      const compressedBackup = JSON.parse(stored);
      const backup = this.decompressBackup(compressedBackup);

      await databaseManager.restoreFromBackup(backup.data);

      console.log('✅ 自动备份恢复成功');
      return true;
    } catch (error) {
      console.error('❌ 自动备份恢复失败:', error);
      return false;
    }
  }

  /**
   * 计算数据大小
   */
  private calculateDataSize(data: any): number {
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  }

  /**
   * 计算校验和
   */
  private async calculateChecksum(data: any): Promise<string> {
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 压缩备份
   */
  private compressBackup(backup: BackupFile): any {
    // 简单的压缩策略：移除不必要的空格和字段
    return {
      metadata: backup.metadata,
      data: {
        core: {
          notes: backup.data.core.notes || [],
          tags: backup.data.core.tags || [],
          settings: backup.data.core.settings || []
          // 其他字段可以根据需要添加
        },
        ai: {
          providers: backup.data.ai.providers || []
          // AI数据可以根据需要选择性压缩
        }
      }
    };
  }

  /**
   * 解压备份
   */
  private decompressBackup(compressed: any): BackupFile {
    // 简单的解压逻辑
    return {
      metadata: compressed.metadata,
      data: {
        core: {
          ...compressed.data.core,
          activities: compressed.data.core.activities || [],
          customShortcuts: compressed.data.core.customShortcuts || []
        },
        ai: {
          ...compressed.data.ai,
          suggestions: compressed.data.ai.suggestions || [],
          usage: compressed.data.ai.usage || [],
          cache: compressed.data.ai.cache || []
        }
      }
    } as BackupFile;
  }

  /**
   * 获取备份历史
   */
  getBackupHistory(): Array<{
    name: string;
    timestamp: string;
    size: string;
    type: 'auto' | 'manual';
  }> {
    const history: any[] = [];

    // 检查localStorage中的自动备份
    const autoBackup = localStorage.getItem('note_revive_auto_backup');
    if (autoBackup) {
      try {
        const backup = JSON.parse(autoBackup);
        history.push({
          name: '自动备份',
          timestamp: backup.metadata.timestamp,
          size: `${(JSON.stringify(backup).length / 1024).toFixed(2)}KB`,
          type: 'auto' as const
        });
      } catch (error) {
        console.warn('自动备份格式错误:', error);
      }
    }

    return history;
  }

  /**
   * 清理旧备份
   */
  async cleanupOldBackups(): Promise<void> {
    try {
      // 清理localStorage中的旧自动备份
      const autoBackup = localStorage.getItem('note_revive_auto_backup');
      if (autoBackup) {
        const backup = JSON.parse(autoBackup);
        const backupDate = new Date(backup.metadata.timestamp);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        if (backupDate < sevenDaysAgo) {
          localStorage.removeItem('note_revive_auto_backup');
          console.log('🧹 清理过期的自动备份');
        }
      }

      // 可以在这里添加更多清理逻辑
    } catch (error) {
      console.error('清理备份失败:', error);
    }
  }
}

// 导出单例实例
export const backupService = BackupService.getInstance();