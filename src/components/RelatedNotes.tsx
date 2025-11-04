import { useState, useEffect } from 'react';
import { Link2, X, RefreshCw } from 'lucide-react';
import { getNoteRelations } from '../services/ai';
import { safeExecuteAI } from '../services/ai/index';
import { Note } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

interface RelatedNotesProps {
  currentNote: Note;
  onSelectNote: (note: Note) => void;
  isVisible: boolean;
}

interface NoteRelation {
  noteId: string;
  relatedNoteIds: string[];
  relationType: 'content' | 'tags' | 'semantic';
  confidence: number;
}

export default function RelatedNotes({
  currentNote,
  onSelectNote,
  isVisible
}: RelatedNotesProps) {
  const [relations, setRelations] = useState<NoteRelation | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [relatedNotes, setRelatedNotes] = useState<Note[]>([]);

  // 获取所有便签
  const allNotes = useLiveQuery(() => db.notes.toArray()) || [];

  // 计算是否应该渲染组件
  const shouldRender = !!currentNote && !currentNote.isPrivate && !dismissed && (isVisible !== false);

  // 获取关联便签的函数
  const fetchRelatedNotes = async () => {
    if (!currentNote || !currentNote.content) return;

    setLoading(true);
    try {
      console.log('RelatedNotes: 开始获取关联便签');
      // 调用AI服务获取关联关系
      if (!currentNote.id) {
        console.warn('RelatedNotes: 当前便签ID不存在，无法获取关联关系');
        setLoading(false);
        return;
      }
      
      // 使用安全的AI执行方式，确保即使AI服务不可用也能工作
      const relationResult = await safeExecuteAI(
        async () => {
          // 尝试使用AI服务
          return await getNoteRelations(currentNote.id!);
        },
        async () => {
          // 降级方案：简单的基于标签和内容的匹配
          console.log('RelatedNotes: AI服务不可用，使用降级匹配策略');
          
          // 过滤出其他便签
          const otherNotes = allNotes.filter(note => 
            note && note.id && note.id !== currentNote.id && !note.isPrivate
          );
          
          // 简单的关键词匹配
          const targetWords = new Set(
            currentNote.content.toLowerCase().split(/\s+/).filter(word => word.length > 1)
          );
          
          // 计算简单相似度
          const scoredNotes = otherNotes
            .map(note => {
              const noteWords = new Set(
                note.content.toLowerCase().split(/\s+/).filter(word => word.length > 1)
              );
              
              // 计算共同词汇
              const commonWords = [...targetWords].filter(word => noteWords.has(word));
              const similarity = commonWords.length / Math.max(targetWords.size, 1);
              
              // 检查标签匹配
              let tagMatch = 0;
              if (currentNote.tags && note.tags) {
                const commonTags = currentNote.tags.filter(tag => note.tags!.includes(tag));
                tagMatch = commonTags.length / Math.max(currentNote.tags.length, 1);
              }
              
              // 综合分数
              const score = Math.max(similarity, tagMatch);
              
              return {
                id: note.id!,
                score,
                relationType: tagMatch > similarity ? 'tags' : 'content'
              };
            })
            .filter(note => note.score > 0.1)
            .sort((a, b) => b.score - a.score)
            .slice(0, 4);
          
          if (scoredNotes.length > 0) {
            return {
              noteId: currentNote.id!,
              relatedNoteIds: scoredNotes.map(n => n.id),
              relationType: scoredNotes[0].relationType,
              confidence: scoredNotes.reduce((sum, n) => sum + n.score, 0) / scoredNotes.length
            };
          }
          
          return null;
        }
      );
      
      console.log('RelatedNotes: 关联结果:', relationResult);
      
      if (relationResult && relationResult.relatedNoteIds && relationResult.relatedNoteIds.length > 0) {
        // 确保relationResult符合NoteRelation类型
        if (relationResult && typeof relationResult === 'object') {
          const typedResult: NoteRelation = {
            noteId: relationResult.noteId,
            relatedNoteIds: relationResult.relatedNoteIds,
            relationType: (relationResult.relationType as 'tags' | 'content' | 'semantic') || 'content',
            confidence: relationResult.confidence
          };
          setRelations(typedResult);
        } else {
          setRelations(null);
        }
        
        // 从所有便签中过滤出关联便签
        const matchedNotes = allNotes.filter(note => 
          note && note.id && 
          relationResult.relatedNoteIds.includes(note.id) && 
          note.id !== currentNote.id // 排除当前便签
        );
        
        console.log('RelatedNotes: 找到关联便签数量:', matchedNotes.length);
        setRelatedNotes(matchedNotes);
      } else {
        console.log('RelatedNotes: 未找到关联便签');
        setRelations(null);
        setRelatedNotes([]);
      }
    } catch (error) {
      console.error('RelatedNotes: 获取关联便签失败:', error);
      setRelations(null);
      setRelatedNotes([]);
    } finally {
      setLoading(false);
    }
  };

  // 当当前便签变化时，获取关联便签
  useEffect(() => {
    if (shouldRender && currentNote) {
      fetchRelatedNotes();
    } else {
      setRelatedNotes([]);
    }
  }, [currentNote?.id, shouldRender, allNotes]); // 依赖allNotes以确保数据同步

  if (!shouldRender) {
    return null;
  }

  const getRelationTypeText = (type: string): string => {
    switch (type) {
      case 'content':
        return '内容相似';
      case 'tags':
        return '标签相同';
      case 'semantic':
        return '语义相关';
      default:
        return '相关';
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.7) return 'text-green-600 bg-green-100';
    if (confidence >= 0.5) return 'text-blue-600 bg-blue-100';
    return 'text-gray-600 bg-gray-100';
  };

  // 添加data-testid用于调试
  return (
    <div className="mt-6 border-t pt-6" data-testid="related-notes-component">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">
            相关便签
          </h3>
          {relations && (
            <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(relations.confidence)}`}>
              {getRelationTypeText(relations.relationType)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!loading && (
            <button
              onClick={() => {
                setRelations(null);
                // 重新获取关联
                setTimeout(() => {
                  setDismissed(false);
                }, 100);
              }}
              className="text-blue-600 hover:text-blue-800 transition-colors"
              title="刷新关联"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="关闭关联"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {relatedNotes.length > 0 ? (
          relatedNotes.map((note) => {
            // 安全检查
            if (!note || !note.content) return null;
            
            const preview = note.content.substring(0, 80) + (note.content.length > 80 ? '...' : '');
            const isMock = note.id?.startsWith('mock-');

            return (
              <div
                key={note.id}
                className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200"
                onClick={() => onSelectNote(note)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 line-clamp-1 flex-1">
                    {preview.substring(0, 40) + '...'}
                  </h4>
                  <span className={`ml-2 text-xs px-2 py-1 rounded ${getConfidenceColor(relations?.confidence || 0.7)}`}>
                    {Math.round((relations?.confidence || 0.7) * 100)}%
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {preview}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {note.tags && Array.isArray(note.tags) && note.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="text-xs bg-white text-gray-700 px-2 py-1 rounded border border-gray-300"
                      >
                        {tag}
                      </span>
                    ))}
                    {note.tags && Array.isArray(note.tags) && note.tags.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{note.tags.length - 3}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-4 text-gray-500">
            暂无相关便签
          </div>
        )}
        
        {loading && (
          <div className="flex items-center justify-center gap-2 text-blue-600 text-sm">
            <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span>优化推荐中...</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          基于内容相似性和标签关联的智能推荐
        </p>
      </div>
    </div>
  );
}