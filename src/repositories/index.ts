// Repository模式 - 数据访问层
// 统一管理所有数据访问接口，提供业务层面的抽象

export { NoteRepository, noteRepository } from './note-repository';
export { AIRepository, aiRepository } from './ai-repository';

// 导出Repository类型
export type {
  NoteRepository as INoteRepository
} from './note-repository';
export type {
  AIRepository as IAIRepository
} from './ai-repository';