// 不直接导入，而是模拟AI服务
// 定义Note类型，不依赖导入
interface Note {
  id: string;
  content: string;
  tags: string[];
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'saved';
}

// 模拟便签数据
const mockNotes: Note[] = [
  {
    id: '1',
    content: '今天完成了项目进度报告，明天需要与团队讨论新功能开发计划。',
    tags: ['工作', '项目', '计划'],
    isPrivate: false,
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
    status: 'saved'
  },
  {
    id: '2',
    content: '项目开发计划会议记录：讨论了新功能的优先级和时间线安排。',
    tags: ['工作', '项目', '会议'],
    isPrivate: false,
    createdAt: new Date('2024-01-02').toISOString(),
    updatedAt: new Date('2024-01-02').toISOString(),
    status: 'saved'
  },
  {
    id: '3',
    content: '今天去超市购物，买了蔬菜、水果和日用品。',
    tags: ['生活', '购物'],
    isPrivate: false,
    createdAt: new Date('2024-01-03').toISOString(),
    updatedAt: new Date('2024-01-03').toISOString(),
    status: 'saved'
  },
  {
    id: '4',
    content: '学习React新特性，计划下周开始使用新特性重构项目组件。',
    tags: ['学习', '技术', 'React'],
    isPrivate: false,
    createdAt: new Date('2024-01-04').toISOString(),
    updatedAt: new Date('2024-01-04').toISOString(),
    status: 'draft'
  },
  {
    id: '5',
    content: '项目进度更新：UI设计已完成，开发正在进行中，预计下周完成第一个版本。',
    tags: ['工作', '项目', '进度'],
    isPrivate: false,
    createdAt: new Date('2024-01-05').toISOString(),
    updatedAt: new Date('2024-01-05').toISOString(),
    status: 'saved'
  }
];

// 测试标签关联推荐功能
async function testTagBasedRelations() {
  console.log('=== 测试标签关联推荐功能 ===');
  
  // 测试用例1：测试标签匹配
  console.log('\n测试用例1：测试标签匹配');
  const testNote1 = {
    id: 'test1',
    content: '这是一条测试便签，用于测试标签匹配功能。',
    tags: ['项目', '工作'],
    isPrivate: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'saved'
  };
  
  // 模拟AI服务实例
  const aiService = {
    isAvailable: () => true,
    settings: { relationEnabled: true },
    calculateSemanticSimilarity: (content1: string, content2: string) => {
      // 简化的语义相似度计算
      const keywords = ['项目', '工作', '计划', '会议', '进度'];
      const matches1 = keywords.filter(keyword => content1.includes(keyword));
      const matches2 = keywords.filter(keyword => content2.includes(keyword));
      const common = matches1.filter(m => matches2.includes(m));
      return common.length * 0.2;
    },
    getNoteRelations: async function(noteId: string, allNotes: Note[]) {
      const targetNote = allNotes.find(note => note.id === noteId);
      if (!targetNote || targetNote.isPrivate) return null;

      const noteScores: Array<{ id: string; score: number; relationType: 'content' | 'tags' | 'semantic' }> = [];

      allNotes.forEach(note => {
        if (note.id === noteId || note.isPrivate) return;

        let contentScore = 0;
        let tagScore = 0;
        let semanticScore = 0;

        // 标签关联分析
        if (targetNote.tags && note.tags) {
          const commonTags = targetNote.tags.filter((tag: string) => note.tags.includes(tag));
          if (commonTags.length > 0) {
            tagScore = Math.min(commonTags.length * 0.4, 1.0);
          }
        }

        // 内容相似性分析（简化版）
        const targetWords = targetNote.content.toLowerCase().split(/\s+/).filter((word: string) => word.length > 2);
        const noteWords = note.content.toLowerCase().split(/\s+/).filter((word: string) => word.length > 2);
        const commonWords = targetWords.filter(word => noteWords.includes(word));
        if (commonWords.length > 0) {
          contentScore = (commonWords.length / Math.max(targetWords.length, noteWords.length)) * 0.8;
        }

        // 语义相似度
        semanticScore = this.calculateSemanticSimilarity(targetNote.content, note.content);

        // 综合评分
        const finalScore = Math.max(contentScore, tagScore, semanticScore);

        if (finalScore > 0.25) {
          let relationType: 'content' | 'tags' | 'semantic' = 'semantic';
          if (tagScore > contentScore && tagScore > semanticScore) {
            relationType = 'tags';
          } else if (contentScore > semanticScore) {
            relationType = 'content';
          }

          noteScores.push({
            id: note.id,
            score: finalScore,
            relationType
          });
        }
      });

      if (noteScores.length === 0) return null;

      // 按评分排序
      noteScores.sort((a, b) => b.score - a.score);
      const topNotes = noteScores.slice(0, 4);

      // 计算置信度
      const avgConfidence = topNotes.reduce((sum, note) => sum + note.score, 0) / topNotes.length;

      return {
        noteId,
        relatedNoteIds: topNotes.map(note => note.id),
        relationType: topNotes[0].relationType,
        confidence: Math.min(avgConfidence * 1.2, 0.95)
      };
    }
  };

  const allNotes = [...mockNotes, testNote1];
  const relations = await aiService.getNoteRelations(testNote1.id, allNotes);
  
  console.log('测试便签:', testNote1);
  console.log('关联结果:', relations);
  
  if (relations) {
    console.log('关联便签详情:');
    relations.relatedNoteIds.forEach(id => {
      const note = allNotes.find(n => n.id === id);
      if (note) {
        console.log(`- ID: ${note.id}, 标签: ${note.tags.join(', ')}`);
      }
    });
  }
  
  // 测试用例2：测试内容相似度
  console.log('\n测试用例2：测试内容相似度');
  const testNote2 = {
    id: 'test2',
    content: '项目进度报告显示开发正在顺利进行，下周将完成第一个版本的开发工作。',
    tags: ['报告'],
    isPrivate: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'saved'
  };
  
  const allNotes2 = [...mockNotes, testNote2];
  const relations2 = await aiService.getNoteRelations(testNote2.id, allNotes2);
  
  console.log('测试便签:', testNote2);
  console.log('关联结果:', relations2);
  
  if (relations2) {
    console.log('关联便签详情:');
    relations2.relatedNoteIds.forEach(id => {
      const note = allNotes2.find(n => n.id === id);
      if (note) {
        console.log(`- ID: ${note.id}, 内容摘要: ${note.content.substring(0, 50)}...`);
      }
    });
  }
  
  // 测试用例3：测试语义关联
  console.log('\n测试用例3：测试语义关联');
  const testNote3 = {
    id: 'test3',
    content: '明天需要参加重要会议，讨论下周的工作计划。',
    tags: ['日程'],
    isPrivate: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'saved'
  };
  
  const allNotes3 = [...mockNotes, testNote3];
  const relations3 = await aiService.getNoteRelations(testNote3.id, allNotes3);
  
  console.log('测试便签:', testNote3);
  console.log('关联结果:', relations3);
  
  if (relations3) {
    console.log('关联便签详情:');
    relations3.relatedNoteIds.forEach(id => {
      const note = allNotes3.find(n => n.id === id);
      if (note) {
        console.log(`- ID: ${note.id}, 内容摘要: ${note.content.substring(0, 50)}...`);
      }
    });
  }
}

// 运行测试
testTagBasedRelations().catch(console.error);