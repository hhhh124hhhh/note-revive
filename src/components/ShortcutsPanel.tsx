import React, { useEffect, useRef } from 'react';
import { Search, FileText, Settings, Palette, Download, Tag, Hash } from 'lucide-react';
import { ShortcutItem } from '../types';
import { t } from '../utils/i18n';
import { addKeyListener } from '../utils/event-listener-manager';

interface ShortcutsPanelProps {
  isOpen: boolean;
  searchQuery: string;
  selectedIndex: number;
  filteredItems: ShortcutItem[];
  onClose: () => void;
  onSearch: (query: string) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onSelectItem: (index?: number) => void;
}

// 图标映射
const iconMap: Record<string, React.ReactNode> = {
  'new-note': <FileText size={20} />,
  'search-notes': <Search size={20} />,
  'open-settings': <Settings size={20} />,
  'toggle-theme': <Palette size={20} />,
  'export-data': <Download size={20} />,
  'tag': <Tag size={20} />,
  'command': <Hash size={20} />
};

const ShortcutsPanel: React.FC<ShortcutsPanelProps> = ({
  isOpen,
  searchQuery,
  selectedIndex,
  filteredItems,
  onClose,
  onSearch,
  onKeyDown,
  onSelectItem
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动聚焦搜索框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // ESC键关闭面板
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          event.preventDefault();
          // 通过onSelectItem来处理索引变化
          if (filteredItems.length > 0) {
            const nextIndex = selectedIndex < filteredItems.length - 1 ? selectedIndex + 1 : 0;
            // 这里需要通过父组件来更新selectedIndex
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          // 通过onSelectItem来处理索引变化
          if (filteredItems.length > 0) {
            const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : filteredItems.length - 1;
            // 这里需要通过父组件来更新selectedIndex
          }
          break;
        case 'Enter':
          event.preventDefault();
          if (filteredItems[selectedIndex]) {
            onSelectItem(selectedIndex);
          }
          break;
      }
    };

    const eventHandler = (e: Event) => {
      handleGlobalKeyDown(e as KeyboardEvent);
    };

    addKeyListener(document, eventHandler);
    return () => document.removeEventListener('keydown', eventHandler);
  }, [isOpen, onClose, filteredItems, selectedIndex, onSelectItem]);

  if (!isOpen) return null;

  const displayItems = filteredItems.length > 0 ? filteredItems : [
    {
      id: 'new-note',
      type: 'action' as const,
      title: t('newNote'),
      description: t('createNewNoteDescription'),
      icon: <FileText size={20} />,
      action: () => {},
      keywords: ['新建', '便签', '创建', 'note', t('newNote').toLowerCase()]
    },
    {
      id: 'search-notes',
      type: 'action' as const,
      title: t('searchNotes'),
      description: t('searchExistingNotesDescription'),
      icon: <Search size={20} />,
      action: () => {},
      keywords: ['搜索', '查找', 'search', t('search').toLowerCase()]
    },
    {
      id: 'open-settings',
      type: 'action' as const,
      title: t('openSettings'),
      description: t('openAppSettingsDescription'),
      icon: <Settings size={20} />,
      action: () => {},
      keywords: ['设置', '配置', 'settings', t('settings').toLowerCase()]
    },
    {
      id: 'toggle-theme',
      type: 'action' as const,
      title: t('toggleTheme'),
      description: t('toggleAppThemeDescription'),
      icon: <Palette size={20} />,
      action: () => {},
      keywords: ['主题', '切换', 'theme', t('theme').toLowerCase()]
    },
    {
      id: 'export-data',
      type: 'action' as const,
      title: t('exportData'),
      description: t('exportNoteDataDescription'),
      icon: <Download size={20} />,
      action: () => {},
      keywords: ['导出', '备份', 'export', t('export').toLowerCase()]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 animate-slide-up">
        {/* 搜索框 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus-within:border-primary-500 focus-within:bg-white">
            <Search size={20} className="text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder={t('enterCommandOrSearch')}
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              onKeyDown={onKeyDown}
              className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
            />
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <kbd className="px-2 py-1 bg-gray-200 rounded border border-gray-300">↑↓</kbd>
              <span>{t('navigate')}</span>
              <kbd className="px-2 py-1 bg-gray-200 rounded border border-gray-300 ml-2">Enter</kbd>
              <span>{t('select')}</span>
              <kbd className="px-2 py-1 bg-gray-200 rounded border border-gray-300 ml-2">ESC</kbd>
              <span>{t('close')}</span>
            </div>
          </div>
        </div>

        {/* 快捷选项列表 */}
        <div className="max-h-96 overflow-y-auto">
          {displayItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Search size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">{t('noCommandsFound')}</p>
              <p className="text-sm">{t('tryOtherKeywords')}</p>
            </div>
          ) : (
            <div className="py-2">
              {displayItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => onSelectItem(index)}
                  className={`w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors ${
                    index === selectedIndex ? 'bg-primary-50 border-r-4 border-primary-500' : ''
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    index === selectedIndex ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {iconMap[item.id] || <Hash size={20} />}
                  </div>

                  <div className="flex-1 text-left">
                    <div className={`font-medium ${
                      index === selectedIndex ? 'text-primary-700' : 'text-gray-900'
                    }`}>
                      {item.title}
                    </div>
                    {item.description && (
                      <div className="text-sm text-gray-500 mt-1">
                        {item.description}
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-400">
                    {index === selectedIndex && (
                      <kbd className="px-2 py-1 bg-primary-100 text-primary-700 rounded border border-primary-200">
                        Enter
                      </kbd>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>{t('quickActionPanel')}</span>
              <span>•</span>
              <span>{t('pressCtrlKToOpen')}</span>
            </div>
            {searchQuery && (
              <span>{t('foundResults', { count: displayItems.length })}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsPanel;