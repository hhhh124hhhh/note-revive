# 数据库架构迁移指南

> **重要提示**: 此迁移过程将彻底重构数据库架构，确保数据安全是首要任务。

## 📋 迁移概述

本文档描述了如何将Note Revive应用从原有的单体数据库架构迁移到新的分离式架构。

### 迁移目标

- ✅ **移除危险的版本99强制重置机制**
- ✅ **实施数据库架构分离（核心数据/AI数据）**
- ✅ **建立健壮的错误处理和恢复机制**
- ✅ **实现Repository模式和智能缓存**
- ✅ **引入事件驱动架构解耦功能**

### 迁移前后对比

| 方面 | 迁移前 | 迁移后 |
|------|--------|--------|
| 数据库架构 | 单一数据库混合存储 | 核心数据库 + AI数据库分离 |
| 版本管理 | 危险的版本99跳跃机制 | 语义化版本管理 |
| 错误处理 | 基础错误处理 | 分类错误处理 + 自动恢复 |
| 数据访问 | 直接数据库操作 | Repository模式封装 |
| 缓存策略 | 简单缓存 | 多层次智能缓存 |
| 功能耦合 | AI与核心功能紧耦合 | 事件驱动解耦 |

---

## 🔄 迁移步骤

### 阶段1: 准备工作

#### 1.1 数据备份
```typescript
import { backupService } from './services/backup-service';

// 创建完整备份
const backup = await backupService.createBackup({
  includeAI: true,
  includeActivities: true,
  maxNotes: 100000, // 备份所有便签
  maxSuggestions: 10000
});

// 保存备份文件
await backupService.saveBackupToFile(backup, 'pre-migration-backup.json');
```

#### 1.2 检查数据库状态
```typescript
import { databaseManager } from './db/database-manager';

const healthCheck = await databaseManager.checkHealth();
console.log('数据库健康状态:', healthCheck);
```

### 阶段2: 代码迁移

#### 2.1 更新数据库导入
```typescript
// 旧的导入方式
import { db } from './db';

// 新的导入方式
import {
  coreDb,
  aiDb,
  databaseManager,
  noteRepository,
  aiRepository
} from './db';

// 使用Repository进行数据操作
const notes = await noteRepository.getAllNotes();
const aiProviders = await aiRepository.getProviders();
```

#### 2.2 便签相关操作迁移
```typescript
// 旧的方式
const notes = await db.notes.toArray();
await db.notes.add(newNote);
await db.notes.update(id, updates);

// 新的方式
import { noteRepository } from './repositories';

const notes = await noteRepository.getAllNotes();
const noteId = await noteRepository.createNote(newNote);
await noteRepository.updateNote(id, updates);
```

#### 2.3 AI相关操作迁移
```typescript
// 旧的方式
const providers = await db.aiProviders.toArray();
await db.aiSuggestions.add(suggestion);

// 新的方式
import { aiRepository } from './repositories';

const providers = await aiRepository.getProviders();
const suggestionId = await aiRepository.saveSuggestion(suggestion);
```

### 阶段3: 数据迁移

#### 3.1 自动数据迁移
```typescript
import { databaseManager } from './db/database-manager';

// 数据库会自动检测版本并执行迁移
console.log('开始数据迁移...');

// 迁移完成后验证数据
const stats = await databaseManager.getStats();
console.log('迁移后数据统计:', stats);
```

#### 3.2 手动数据验证
```typescript
// 验证核心数据
const coreHealth = await databaseManager.checkHealth();
if (coreHealth.core.status === 'error') {
  console.error('核心数据迁移失败，需要恢复备份');
  // 执行恢复逻辑
}

// 验证AI数据
if (coreHealth.ai.status === 'error') {
  console.warn('AI数据迁移失败，应用将降级运行');
  // AI功能降级处理
}
```

### 阶段4: 集成新功能

#### 4.1 启用智能缓存
```typescript
import { noteCache, aiCache } from './services/cache-service';

// 自动缓存便签数据
const notes = await noteRepository.getRecentNotes(50);
for (const note of notes) {
  await noteCache.set(`note_${note.id}`, note, 10 * 60 * 1000); // 10分钟
}
```

#### 4.2 启用事件驱动
```typescript
import { appEventService } from './services/event-service';

// 监听便签创建事件
appEventService.onNoteCreated((note) => {
  console.log('新便签创建:', note.id);
});

// 发布便签更新事件
await appEventService.noteUpdated(updatedNote, changes);
```

#### 4.3 启用查询优化
```typescript
import { queryOptimizer } from './services/query-optimizer';

// 使用优化的搜索
const results = await queryOptimizer.optimizedSearchNotes('搜索词', {
  limit: 20,
  includeContent: true,
  dateRange: { start: startDate, end: endDate }
});
```

---

## 🔧 配置调整

### 更新应用初始化代码

```typescript
// main.tsx 或 App.tsx

import { databaseManager } from './db/database-manager';
import { queryOptimizer } from './services/query-optimizer';
import { appEventService } from './services/event-service';
import { backupService } from './services/backup-service';

// 应用启动时
async function initializeApp() {
  try {
    // 1. 检查数据库健康状态
    const healthCheck = await databaseManager.checkHealth();

    if (healthCheck.overall === 'error') {
      console.error('数据库健康检查失败，尝试自动恢复...');
      // 尝试从自动备份恢复
      const recovered = await backupService.restoreFromAutoBackup();
      if (!recovered) {
        throw new Error('自动恢复失败，需要手动处理');
      }
    }

    // 2. 执行性能优化检查
    const performanceReport = queryOptimizer.getPerformanceReport();
    console.log('性能报告:', performanceReport);

    // 3. 初始化事件系统
    // (事件系统在模块导入时自动初始化)

    console.log('✅ 应用初始化完成');
  } catch (error) {
    console.error('❌ 应用初始化失败:', error);
    // 显示错误界面，提供恢复选项
  }
}
```

### 更新组件代码示例

#### 便签列表组件
```typescript
// NoteList.tsx
import { noteRepository } from '../repositories';
import { appEventService } from '../services/event-service';
import { noteCache } from '../services/cache-service';

function NoteList() {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    loadNotes();

    // 监听便签变更事件
    const unsubscribe = appEventService.onNoteUpdated(() => {
      loadNotes();
    });

    return unsubscribe;
  }, []);

  const loadNotes = async () => {
    try {
      // 先尝试从缓存获取
      const cached = await noteCache.get('recent_notes');
      if (cached) {
        setNotes(cached);
        return;
      }

      // 从数据库获取
      const notesData = await noteRepository.getRecentNotes(50);
      setNotes(notesData);

      // 缓存数据
      await noteCache.set('recent_notes', notesData, 5 * 60 * 1000); // 5分钟
    } catch (error) {
      console.error('加载便签失败:', error);
    }
  };

  const handleNoteCreate = async (noteData: Omit<Note, 'id'>) => {
    try {
      const noteId = await noteRepository.createNote(noteData);
      const newNote = await noteRepository.getNote(noteId);

      if (newNote) {
        // 发布便签创建事件
        await appEventService.noteCreated(newNote);
      }
    } catch (error) {
      console.error('创建便签失败:', error);
    }
  };

  // ... 其他组件逻辑
}
```

#### AI设置组件
```typescript
// AISettings.tsx
import { aiRepository } from '../repositories';
import { appEventService } from '../services/event-service';

function AISettings() {
  const [providers, setProviders] = useState<AIProvider[]>([]);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const providersData = await aiRepository.getProviders();
      setProviders(providersData);
    } catch (error) {
      console.error('加载AI提供商失败:', error);
    }
  };

  const handleProviderConfigured = async (providerId: number, providerType: string) => {
    try {
      await appEventService.aiProviderConfigured(providerId, providerType);
    } catch (error) {
      console.error('AI提供商配置事件发布失败:', error);
    }
  };

  // ... 其他组件逻辑
}
```

---

## 🚨 回滚计划

如果迁移过程中出现问题，可以按以下步骤回滚：

### 1. 停止新架构代码
```typescript
// 在数据库导入时使用旧的数据库
import { db } from './db'; // 旧的数据库文件
```

### 2. 恢复数据
```typescript
import { backupService } from './services/backup-service';

// 从备份文件恢复
const backup = await backupService.loadBackupFromFile(file);
await databaseManager.restoreFromBackup(backup);
```

### 3. 重新部署旧版本
- 使用迁移前的代码分支
- 确保数据库文件存在
- 验证应用功能正常

---

## 📊 迁移验证

### 功能验证清单

- [ ] **核心功能**
  - [ ] 便签创建、编辑、删除
  - [ ] 标签管理
  - [ ] 搜索和过滤
  - [ ] 设置管理

- [ ] **AI功能**
  - [ ] AI提供商配置
  - [ ] AI建议生成
  - [ ] 模型使用统计
  - [ ] 智能缓存

- [ ] **系统功能**
  - [ ] 数据备份和恢复
  - [ ] 错误处理和恢复
  - [ ] 性能监控
  - [ ] 事件系统

### 性能验证

```typescript
// 性能测试代码
const performanceTest = async () => {
  const startTime = performance.now();

  // 测试便签加载性能
  const notes = await noteRepository.getAllNotes();
  const loadTime = performance.now() - startTime;

  console.log(`便签加载性能: ${loadTime.toFixed(2)}ms (${notes.length}条便签)`);

  // 测试搜索性能
  const searchStartTime = performance.now();
  const searchResults = await queryOptimizer.optimizedSearchNotes('test', {
    limit: 50
  });
  const searchTime = performance.now() - searchStartTime;

  console.log(`搜索性能: ${searchTime.toFixed(2)}ms (${searchResults.length}个结果)`);

  // 测试缓存性能
  const cacheStartTime = performance.now();
  const cachedNotes = await noteCache.get('recent_notes');
  const cacheTime = performance.now() - cacheStartTime;

  console.log(`缓存访问性能: ${cacheTime.toFixed(2)}ms`);
};
```

### 数据完整性验证

```typescript
// 数据完整性检查
const dataIntegrityCheck = async () => {
  const stats = await databaseManager.getStats();

  console.log('数据完整性检查结果:');
  console.log('- 便签数量:', stats.core.notes);
  console.log('- 标签数量:', stats.core.tags);
  console.log('- AI提供商数量:', stats.ai.providers);
  console.log('- AI建议数量:', stats.ai.suggestions);
  console.log('- 总数据量:', stats.total);

  // 检查数据一致性
  const healthCheck = await databaseManager.checkHealth();
  console.log('健康检查结果:', healthCheck);
};
```

---

## 🔍 故障排除

### 常见问题及解决方案

#### 问题1: 数据库版本冲突
**症状**: SchemaError 或 VersionError
**解决方案**:
```typescript
// 清理本地存储并重新初始化
localStorage.clear();
location.reload();
```

#### 问题2: AI功能不可用
**症状**: AI相关操作失败
**解决方案**:
```typescript
// 检查AI数据库状态
const healthCheck = await databaseManager.checkHealth();
if (healthCheck.ai.status === 'error') {
  console.log('AI数据库降级运行');
  // 禁用AI功能，保持核心功能正常
}
```

#### 问题3: 缓存问题
**症状**: 数据显示不一致或性能下降
**解决方案**:
```typescript
// 清理所有缓存
import { cacheService } from './services/cache-service';
cacheService.clearAll();
```

#### 问题4: 事件系统问题
**症状**: 功能更新不及时
**解决方案**:
```typescript
// 重新初始化事件系统
const eventBus = EventBus.getInstance();
eventBus.clearEventHistory();
```

---

## 📚 参考资料

- [数据库架构分析报告](./DATABASE_ISSUES_ANALYSIS.md)
- [API文档](./docs/API.md)
- [最佳实践指南](./docs/BEST_PRACTICES.md)

---

## 🎯 迁移成功标准

迁移成功后，应用应该：

1. **功能完整性**: 所有原有功能正常工作
2. **性能提升**: 查询响应时间减少30%以上
3. **稳定性**: 无数据丢失，错误恢复机制有效
4. **可维护性**: 代码结构清晰，易于扩展
5. **用户体验**: 应用响应更快，界面更流畅

---

**迁移完成后，建议定期监控应用性能和数据完整性，及时发现并解决潜在问题。**