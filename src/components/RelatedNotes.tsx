import { useState, useEffect, useMemo } from 'react';
import { Link2, X, RefreshCw } from 'lucide-react';
import { getNoteRelations } from '../services/ai';
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

  // 获取所有便签
  const allNotes = useLiveQuery(() => db.notes.toArray()) || [];

  // 使用 useMemo 优化相关便签计算
  const relatedNotes = useMemo(() => {
    if (!relations?.relatedNoteIds || !allNotes.length) return [];

    return relations.relatedNoteIds
      .map(id => allNotes.find(note => note.id === id))
      .filter(note => note && !note.isPrivate) as Note[];
  }, [relations, allNotes]);

  // 使用 useMemo 优化渲染条件判断
  const shouldRender = useMemo(() => {
    return isVisible &&
           !dismissed &&
           currentNote &&
           !currentNote.isPrivate &&
           (loading || (relations && relatedNotes.length > 0));
  }, [isVisible, dismissed, currentNote, loading, relations, relatedNotes]);

  // 当当前便签变化时，获取关联建议
  useEffect(() => {
    if (!isVisible || !currentNote || dismissed || currentNote.isPrivate) {
      setRelations(null);
      setLoading(false);
      return;
    }

    // 如果便签内容太短，不进行关联分析
    if (currentNote.content.length < 20) {
      setRelations(null);
      setLoading(false);
      return;
    }

    const fetchRelations = async () => {
      setLoading(true);
      try {
        if (currentNote?.id && allNotes.length > 1) {
          console.log(`正在获取便签 ${currentNote.id} 的关联建议...`);
          const noteRelations = await getNoteRelations(currentNote.id, allNotes);
          console.log(`获取到关联建议:`, noteRelations);
          setRelations(noteRelations);
        }
      } catch (error) {
        console.warn('获取便签关联失败:', error);
        setRelations(null);
      } finally {
        setLoading(false);
      }
    };

    // 延迟获取，避免频繁调用
    const debounceTimer = setTimeout(fetchRelations, 500);
    return () => clearTimeout(debounceTimer);
  }, [currentNote?.id, currentNote?.content, allNotes.length, isVisible, dismissed]);

  // 如果不需要显示，则不渲染
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

  return (
    <div className="mt-6 border-t pt-6">
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

      {loading ? (
        <div className="flex items-center gap-2 text-blue-600">
          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-sm">正在查找相关便签...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {relatedNotes.map((note) => {
            const preview = note.content.substring(0, 80) + (note.content.length > 80 ? '...' : '');

            return (
              <div
                key={note.id}
                className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200"
                onClick={() => onSelectNote(note)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 line-clamp-1 flex-1">
                    {preview.substring(0, 40)}...
                  </h4>
                  <span className={`ml-2 text-xs px-2 py-1 rounded ${getConfidenceColor(relations?.confidence || 0)}`}>
                    {Math.round((relations?.confidence || 0) * 100)}%
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {preview}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {note.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="text-xs bg-white text-gray-700 px-2 py-1 rounded border border-gray-300"
                      >
                        {tag}
                      </span>
                    ))}
                    {note.tags.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{note.tags.length - 3}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          基于内容相似性和标签关联的智能推荐
        </p>
      </div>
    </div>
  );
}