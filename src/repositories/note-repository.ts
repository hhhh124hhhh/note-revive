import { db as coreDb } from '../db';
import { Note as NoteType, Tag } from '../types';
import { databaseManager } from '../db/database-manager';

/**
 * 便签数据访问层 - Repository模式
 * 封装所有便签相关的数据库操作，提供业务层面的数据访问接口
 */
export class NoteRepository {
  private static instance: NoteRepository;

  private constructor() {}

  public static getInstance(): NoteRepository {
    if (!NoteRepository.instance) {
      NoteRepository.instance = new NoteRepository();
    }
    return NoteRepository.instance;
  }

  /**
   * 创建便签
   */
  async createNote(note: Omit<NoteType, 'id'>): Promise<string> {
    try {
      const id = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newNote: NoteType = {
        ...note,
        id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await coreDb.notes.add(newNote);
      console.log('✅ 便签创建成功:', id);
      return id;
    } catch (error) {
      console.error('❌ 创建便签失败:', error);
      throw new Error(`创建便签失败: ${(error as Error).message}`);
    }
  }

  /**
   * 获取便签
   */
  async getNote(id: string): Promise<NoteType | undefined> {
    try {
      return await coreDb.notes.get(id);
    } catch (error) {
      console.error('❌ 获取便签失败:', error);
      throw new Error(`获取便签失败: ${(error as Error).message}`);
    }
  }

  /**
   * 更新便签
   */
  async updateNote(id: string, updates: Partial<NoteType>): Promise<void> {
    try {
      await coreDb.notes.update(id, {
        ...updates,
        updatedAt: new Date()
      });
      console.log('✅ 便签更新成功:', id);
    } catch (error) {
      console.error('❌ 更新便签失败:', error);
      throw new Error(`更新便签失败: ${(error as Error).message}`);
    }
  }

  /**
   * 删除便签（同时删除相关AI数据）
   */
  async deleteNote(id: string): Promise<void> {
    try {
      await databaseManager.deleteNoteWithAIData(id);
      console.log('✅ 便签删除成功:', id);
    } catch (error) {
      console.error('❌ 删除便签失败:', error);
      throw new Error(`删除便签失败: ${(error as Error).message}`);
    }
  }

  /**
   * 获取所有便签
   */
  async getAllNotes(): Promise<NoteType[]> {
    try {
      return await coreDb.notes.orderBy('updatedAt').reverse().toArray();
    } catch (error) {
      console.error('❌ 获取便签列表失败:', error);
      throw new Error(`获取便签列表失败: ${(error as Error).message}`);
    }
  }

  /**
   * 分页获取便签
   */
  async getNotesPaginated(
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      status?: NoteType['status'];
      tags?: string[];
      isPrivate?: boolean;
      dateRange?: {
        start: Date;
        end: Date;
      };
      searchQuery?: string;
    }
  ): Promise<{
    notes: NoteType[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    try {
      let query = coreDb.notes.orderBy('updatedAt').reverse();

      // 应用过滤条件
      if (filters) {
        if (filters.status) {
          query = query.filter(note => note.status === filters.status);
        }

        if (filters.isPrivate !== undefined) {
          query = query.filter(note => note.isPrivate === filters.isPrivate);
        }

        if (filters.tags && filters.tags.length > 0) {
          query = query.filter(note =>
            filters.tags!.some(tag => note.tags.includes(tag))
          );
        }

        if (filters.dateRange) {
          query = query.filter(note =>
            note.createdAt >= filters.dateRange!.start &&
            note.createdAt <= filters.dateRange!.end
          );
        }

        if (filters.searchQuery) {
          const searchLower = filters.searchQuery.toLowerCase();
          query = query.filter(note =>
            (note.title || '').toLowerCase().includes(searchLower) ||
            note.content.toLowerCase().includes(searchLower)
          );
        }
      }

      // 获取总数
      const total = await query.count();

      // 计算分页
      const offset = (page - 1) * pageSize;
      const totalPages = Math.ceil(total / pageSize);

      // 获取分页数据
      const notes = await query.offset(offset).limit(pageSize).toArray();

      return {
        notes,
        total,
        page,
        pageSize,
        totalPages
      };
    } catch (error) {
      console.error('❌ 分页获取便签失败:', error);
      throw new Error(`分页获取便签失败: ${(error as Error).message}`);
    }
  }

  /**
   * 按标签获取便签
   */
  async getNotesByTag(tagName: string): Promise<NoteType[]> {
    try {
      const allNotes = await coreDb.notes.toArray();
      return allNotes
        .filter(note => note.tags.includes(tagName))
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      console.error('❌ 按标签获取便签失败:', error);
      throw new Error(`按标签获取便签失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 按状态获取便签
   */
  async getNotesByStatus(status: NoteType['status']): Promise<NoteType[]> {
    try {
      const allNotes = await coreDb.notes.toArray();
      return allNotes
        .filter(note => note.status === status)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      console.error('❌ 按状态获取便签失败:', error);
      throw new Error(`按状态获取便签失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 搜索便签
   */
  async searchNotes(
    query: string,
    options?: {
      searchInTitle?: boolean;
      searchInContent?: boolean;
      searchInTags?: boolean;
      limit?: number;
    }
  ): Promise<NoteType[]> {
    try {
      const {
        searchInTitle = true,
        searchInContent = true,
        searchInTags = false,
        limit = 50
      } = options || {};

      const searchLower = query.toLowerCase();

      let filteredNotes = await coreDb.notes.toArray();

      filteredNotes = filteredNotes.filter(note => {
        let matches = false;

        if (searchInTitle && (note.title || '').toLowerCase().includes(searchLower)) {
          matches = true;
        }

        if (searchInContent && note.content.toLowerCase().includes(searchLower)) {
          matches = true;
        }

        if (searchInTags && note.tags.some(tag => tag.toLowerCase().includes(searchLower))) {
          matches = true;
        }

        return matches;
      });

      // 按更新时间排序并限制数量
      return filteredNotes
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('❌ 搜索便签失败:', error);
      throw new Error(`搜索便签失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取最近创建的便签
   */
  async getRecentNotes(limit: number = 10): Promise<NoteType[]> {
    try {
      const allNotes = await coreDb.notes.toArray();
      return allNotes
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('❌ 获取最近便签失败:', error);
      throw new Error(`获取最近便签失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取需要回顾的便签
   */
  async getNotesForReview(): Promise<NoteType[]> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const allNotes = await coreDb.notes.toArray();

      return allNotes
        .filter(note => note.status !== 'reviewed' && note.createdAt < sevenDaysAgo)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } catch (error) {
      console.error('❌ 获取需要回顾的便签失败:', error);
      throw new Error(`获取需要回顾的便签失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 批量更新便签状态
   */
  async batchUpdateStatus(
    noteIds: string[],
    status: NoteType['status']
  ): Promise<void> {
    try {
      await coreDb.transaction('rw', coreDb.notes, async () => {
        for (const id of noteIds) {
          await coreDb.notes.update(id, {
            status,
            updatedAt: new Date()
          });
        }
      });
      console.log(`✅ 批量更新状态成功: ${noteIds.length}个便签`);
    } catch (error) {
      console.error('❌ 批量更新状态失败:', error);
      throw new Error(`批量更新状态失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取便签统计信息
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<NoteType['status'], number>;
    byTag: Record<string, number>;
    recentlyCreated: number;
    recentlyUpdated: number;
  }> {
    try {
      const allNotes = await coreDb.notes.toArray();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // 按状态统计
      const byStatus = allNotes.reduce((acc: Record<NoteType['status'], number>, note: NoteType) => {
        acc[note.status] = (acc[note.status] || 0) + 1;
        return acc;
      }, {} as Record<NoteType['status'], number>);

      // 按标签统计
      const byTag = allNotes.reduce((acc: Record<string, number>, note: NoteType) => {
        note.tags.forEach((tag: string) => {
          acc[tag] = (acc[tag] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>);

      // 最近创建和更新的数量
      const recentlyCreated = allNotes.filter((note: NoteType) => note.createdAt >= sevenDaysAgo).length;
      const recentlyUpdated = allNotes.filter((note: NoteType) => note.updatedAt >= sevenDaysAgo).length;

      return {
        total: allNotes.length,
        byStatus,
        byTag,
        recentlyCreated,
        recentlyUpdated
      };
    } catch (error) {
      console.error('❌ 获取便签统计失败:', error);
      throw new Error(`获取便签统计失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 清理便签数据
   */
  async cleanupNotes(options?: {
    olderThan?: Date;
    status?: NoteType['status'];
    keepMinCount?: number;
  }): Promise<{ deletedCount: number }> {
    try {
      const {
        olderThan,
        status,
        keepMinCount = 0
      } = options || {};

      let query = coreDb.notes.toCollection();

      if (olderThan) {
        query = query.filter(note => note.createdAt < olderThan);
      }

      if (status) {
        query = query.filter(note => note.status === status);
      }

      const notesToDelete = await query.toArray();

      // 保留最少数量
      const finalNotesToDelete = notesToDelete.length > keepMinCount
        ? notesToDelete.slice(0, notesToDelete.length - keepMinCount)
        : [];

      let deletedCount = 0;
      for (const note of finalNotesToDelete) {
        if (note.id) {
          await this.deleteNote(note.id);
        }
        deletedCount++;
      }

      console.log(`✅ 清理完成: 删除了 ${deletedCount} 个便签`);
      return { deletedCount };
    } catch (error) {
      console.error('❌ 清理便签失败:', error);
      throw new Error(`清理便签失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// 导出单例实例
export const noteRepository = NoteRepository.getInstance();