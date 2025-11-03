/**
 * 数据库重置工具
 * 用于在遇到严重 schema 错误时重置数据库
 */

import { db } from '../db';

export class DatabaseResetManager {
  private static instance: DatabaseResetManager;

  private constructor() {}

  static getInstance(): DatabaseResetManager {
    if (!DatabaseResetManager.instance) {
      DatabaseResetManager.instance = new DatabaseResetManager();
    }
    return DatabaseResetManager.instance;
  }

  /**
   * 检查数据库是否需要重置
   */
  async needsReset(): Promise<boolean> {
    try {
      // 尝试简单的数据库操作
      await db.aiProviders.limit(1).toArray();
      return false;
    } catch (error) {
      console.warn('数据库检查失败:', error);
      return error instanceof Error &&
        (error.message.includes('SchemaError') ||
         error.message.includes('KeyPath') ||
         error.message.includes('indexed'));
    }
  }

  /**
   * 重置数据库（危险操作！）
   */
  async resetDatabase(): Promise<void> {
    console.warn('⚠️ 开始重置数据库，这将删除所有数据！');

    try {
      // 关闭当前数据库连接
      await db.close();

      // 删除数据库
      await db.delete();
      console.log('🗑️ 数据库已删除');

      // 清理本地存储
      localStorage.clear();
      sessionStorage.clear();
      console.log('🧹 本地存储已清理');

      // 重新创建数据库实例
      window.location.reload();

    } catch (error) {
      console.error('❌ 重置数据库失败:', error);
      throw error;
    }
  }

  /**
   * 安全的数据库重置（带确认）
   */
  async safeResetDatabase(): Promise<boolean> {
    if (await this.needsReset()) {
      console.warn('🚨 检测到数据库问题，需要重置');

      // 在浏览器环境中显示确认对话框
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm(
          '检测到数据库损坏，需要重置。这将删除所有便签和设置，是否继续？'
        );

        if (confirmed) {
          await this.resetDatabase();
          return true;
        } else {
          console.warn('用户取消了数据库重置');
          return false;
        }
      } else {
        // 非浏览器环境，直接重置
        await this.resetDatabase();
        return true;
      }
    }

    return false;
  }

  /**
   * 检查数据库版本兼容性
   */
  async checkVersionCompatibility(): Promise<boolean> {
    try {
      const version = await db.verno;
      console.log(`📊 当前数据库版本: ${version}`);

      // 支持的版本范围
      const SUPPORTED_VERSIONS = [1, 2, 3, 4];

      if (SUPPORTED_VERSIONS.includes(version)) {
        console.log('✅ 数据库版本兼容');
        return true;
      } else {
        console.warn(`❌ 不支持的数据库版本: ${version}`);
        return false;
      }
    } catch (error) {
      console.error('检查数据库版本失败:', error);
      return false;
    }
  }

  /**
   * 获取数据库健康状态
   */
  async getDatabaseHealth(): Promise<{
    healthy: boolean;
    version: number;
    tables: string[];
    issues: string[];
  }> {
    const issues: string[] = [];
    let healthy = true;
    let version = 0;
    const tables: string[] = [];

    try {
      // 检查版本
      version = await db.verno;

      // 检查关键表是否存在
      const tableNames = ['notes', 'tags', 'settings', 'aiProviders'];

      for (const tableName of tableNames) {
        try {
          // 使用更宽松的检查方式，避免因临时连接问题导致误判
          await db.table(tableName).limit(1).toArray();
          tables.push(tableName);
        } catch (error) {
          // 只有在确定是结构性问题时才标记为不健康
          if (error instanceof Error && 
              (error.message.includes('not exist') || 
               error.message.includes('not found') || 
               error.message.includes('Schema'))) {
            issues.push(`表 ${tableName} 结构异常`);
            healthy = false;
          } else {
            // 临时性错误，不标记为不健康
            console.warn(`表 ${tableName} 临时访问问题:`, error);
          }
        }
      }

      // 检查是否需要重置（只在明确需要时才标记为不健康）
      if (await this.needsReset()) {
        issues.push('数据库需要重置');
        // 不立即标记为不健康，给应用一次修复机会
      }

    } catch (error) {
      // 只有在严重错误时才标记为不健康
      if (error instanceof Error && 
          (error.message.includes('version') || 
           error.message.includes('Schema') || 
           error.message.includes('corrupt'))) {
        issues.push(`数据库严重错误: ${error}`);
        healthy = false;
      } else {
        // 临时性错误，记录但不标记为不健康
        console.warn('数据库健康检查临时问题:', error);
      }
    }

    return {
      healthy,
      version,
      tables,
      issues
    };
  }
}

// 导出单例实例
export const databaseResetManager = DatabaseResetManager.getInstance();

// 便捷函数
export const resetDatabase = () => databaseResetManager.resetDatabase();
export const safeResetDatabase = () => databaseResetManager.safeResetDatabase();
export const checkDatabaseHealth = () => databaseResetManager.getDatabaseHealth();