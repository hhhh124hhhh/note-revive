import { useState, useEffect } from 'react';
import { Search, Lightbulb, X } from 'lucide-react';
import { getSearchSuggestions } from '../services/ai';
import { Note } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { SimpleAIWrapper } from './AIWrapperSimple';

interface AISearchSuggestionsProps {
  query: string;
  onSelectNote: (note: Note) => void;
  isVisible: boolean;
}

interface SearchSuggestion {
  noteId: string;
  relevanceScore: number;
  reason: string;
  matchedKeywords: string[];
}

export default function AISearchSuggestions({
  query,
  onSelectNote,
  isVisible
}: AISearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // 获取所有便签
  const allNotes = useLiveQuery(() => db.notes.toArray()) || [];

  // 当查询变化时，获取AI建议
  useEffect(() => {
    if (!query || query.length < 2 || !isVisible || dismissed) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        // 检查 AI 功能是否可用
        const isAIEnabled = typeof import.meta !== 'undefined' &&
                           import.meta.env &&
                           import.meta.env.VITE_AI_ENABLED !== 'false';

        if (!isAIEnabled) {
          // AI 功能被禁用，返回空建议
          setSuggestions([]);
          return;
        }

        const aiSuggestions = await getSearchSuggestions(query, allNotes);
        setSuggestions(aiSuggestions);
      } catch (error) {
        console.warn('获取AI搜索建议失败:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 500);
    return () => clearTimeout(debounceTimer);
  }, [query, allNotes, isVisible, dismissed]);

  // 如果不需要显示，则不渲染
  if (!isVisible || dismissed) {
    return null;
  }

  // 根据noteId获取便签数据
  const getSuggestionNote = (noteId: string): Note | undefined => {
    return allNotes.find(note => note.id === noteId);
  };

  return (
    <SimpleAIWrapper
      fallback={null} // AI 不可用时不显示任何内容
      showStatus={false}
    >
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-blue-900">
              {loading ? 'AI正在思考...' : '您可能在找...'}
            </h3>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            aria-label="关闭建议"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-blue-700">
            <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-sm">正在分析相关内容...</span>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-2">
            {suggestions.map((suggestion) => {
              const note = getSuggestionNote(suggestion.noteId);
              if (!note) return null;

              const preview = note.isPrivate
                ? '🔒 加密内容'
                : note.content.substring(0, 100) + (note.content.length > 100 ? '...' : '');

              return (
                <div
                  key={suggestion.noteId}
                  className="bg-white rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors border border-blue-100"
                  onClick={() => onSelectNote(note)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 line-clamp-1 flex-1">
                      {preview.substring(0, 50)}...
                    </h4>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {Math.round(suggestion.relevanceScore * 100)}% 匹配
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {preview}
                  </p>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-blue-600">
                      {suggestion.reason}
                    </p>
                    <div className="flex items-center gap-2">
                      {note.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {note.tags.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{note.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-blue-600 text-sm">没有找到相关建议，请尝试其他关键词</p>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-xs text-blue-600 flex items-center gap-1">
            <Search className="w-3 h-3" />
            基于语义分析的智能建议，帮助您更快找到相关内容
          </p>
        </div>
      </div>
    </SimpleAIWrapper>
  );
}