import { useEffect, useState, useCallback } from 'react';
import {
  Home,
  Search,
  Tag,
  Award,
  Plus,
  X,
  Save,
  Eye,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Calendar,
  TrendingUp,
  EyeOff,
  Settings as SettingsIcon
} from 'lucide-react';
import {
  db,
  Note,
  initUserPoints,
  addPoints,
  checkAchievements,
  checkReviewReminder,
  ACHIEVEMENTS,
  encryptContent,
  decryptContent,
  initDefaultSettings,
  initDefaultShortcuts
} from './db';
import { useLiveQuery } from 'dexie-react-hooks';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  View,
  EditorMode,
  EditingNote,
  Theme
} from './types';
import { useShortcuts } from './hooks/useShortcuts';
import { useSettings } from './hooks/useSettings';
import { useNotifications } from './hooks/useNotifications';
import { useDialog } from './hooks/useDialog';
import ShortcutsPanel from './components/ShortcutsPanel';
import Settings from './components/Settings';
import NotificationPanel, { NotificationCard } from './components/NotificationPanel';
import { getTagTextColor } from './utils/colorContrast';
import { t } from './utils/i18n';

  const formatDate = (date: Date, language: 'zh' | 'en' = 'zh'): string => {
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [editingNote, setEditingNote] = useState<EditingNote>({
    content: '',
    tags: [],
    isPrivate: false,
    status: 'draft'
  });
  const [editorMode, setEditorMode] = useState<EditorMode>('split');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [showReviewReminder, setShowReviewReminder] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [showTagCreator, setShowTagCreator] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'zh' | 'en'>('zh');

  // 在组件内部定义 getStatusText 函数，确保能访问最新的语言状态
  const getStatusText = (status: string): string => {
    // 根据当前语言状态进行翻译
    switch (status) {
      case 'draft':
        return currentLanguage === 'zh' ? '草稿' : 'Draft';
      case 'saved':
        return currentLanguage === 'zh' ? '已保存' : 'Saved';
      case 'reviewed':
        return currentLanguage === 'zh' ? '已回顾' : 'Reviewed';
      case 'reused':
        return currentLanguage === 'zh' ? '已复用' : 'Reused';
      default:
        return status;
    }
  };

  // 设置和快捷键系统
  const {
    settings,
    updateSettings,
    toggleTheme
  } = useSettings({
    onThemeChange: () => {
      // 主题变更处理逻辑已在useSettings中实现
    }
  });

  // 导出数据函数需要在useShortcuts之前定义
  const handleExportData = async () => {
    if (!settings) return;

    try {
      const { exportNotes, generateExportFilename, downloadFile } = await import('./utils/format');
      const allNotes = await db.notes.toArray();
      const exportedData = exportNotes(allNotes, settings.exportFormat);
      const filename = generateExportFilename(settings.exportFormat);

      const mimeType = settings.exportFormat === 'json' ? 'application/json' :
                      settings.exportFormat === 'markdown' ? 'text/markdown' : 'text/plain';

      downloadFile(exportedData, filename, mimeType);
    } catch (error) {
      console.error('Export data failed:', error);
      showErrorNotification(t('exportFailed'), t('errorRetry'));
    }
  };

  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const {
    shortcutsState,
    closeShortcutsPanel,
    handleShortcutsSearch,
    handleShortcutsKeyDown,
    selectShortcutItem
  } = useShortcuts({
    onToggleShortcuts: () => setShortcutsOpen(true),
    onNewNote: () => {
      setCurrentNote(null);
      setEditingNote({
        content: '',
        tags: [],
        isPrivate: false,
        status: 'draft'
      });
      setCurrentView('editor');
    },
    onSearch: () => setCurrentView('search'),
    onSave: () => {
      if (currentView === 'editor') {
        saveNote();
      }
    },
    onSettings: () => setCurrentView('settings'),
    onToggleTheme: toggleTheme,
    onExportData: handleExportData,
    onFocusSearch: () => {
      setCurrentView('search');
      // 聚焦搜索框的逻辑
    }
  });

  // 通知系统
  const {
    notifications,
    isPanelOpen,
    showError: showErrorNotification,
    showAchievement,
    removeNotification,
    clearNotifications
  } = useNotifications({
    maxNotifications: 10,
    defaultDuration: 5000,
    enablePanel: true
  });

  // 现代弹窗系统
  const { showConfirm, showError, showSuccess, DialogComponent } = useDialog();

  // 添加刷新触发器状态
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 加载数据
  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray());
  const tags = useLiveQuery(() => db.tags.orderBy('createdAt').toArray());
  const allTagsForView = useLiveQuery(() => db.tags.toArray());
  // 优化等级查询：使用 toArray() 代替 get() 以更好地监听变化，并添加刷新触发器
  const userPointsList = useLiveQuery(
    () => db.userPoints.where('id').equals(1).toArray(),
    [refreshTrigger] // 依赖项，当 refreshTrigger 变化时重新查询
  );
  const userPoints = userPointsList?.[0]; // 获取第一条记录
  const recentActivities = useLiveQuery(() =>
    db.activities.orderBy('timestamp').reverse().limit(10).toArray()
  );

  
  // 强制刷新等级显示的函数
  const refreshUserPoints = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // 触发等级提升动画
  const triggerLevelUpAnimation = useCallback((newLevel: number) => {
    // 使用 newLevel 参数避免未使用变量警告
    void newLevel;
    // 桌面端等级显示动画
    const desktopLevelDisplay = document.getElementById('desktop-level-display');
    if (desktopLevelDisplay) {
      desktopLevelDisplay.classList.remove('animate-pulse-once', 'level-up-animation');
      void desktopLevelDisplay.offsetWidth; // 强制重排
      desktopLevelDisplay.classList.add('level-up-animation');

      setTimeout(() => {
        desktopLevelDisplay.classList.remove('level-up-animation');
        desktopLevelDisplay.classList.add('animate-pulse-once');
      }, 800);
    }

    // 移动端等级显示动画
    const mobileLevelDisplay = document.getElementById('mobile-level-display');
    if (mobileLevelDisplay) {
      mobileLevelDisplay.classList.remove('animate-pulse-once', 'level-up-animation');
      void mobileLevelDisplay.offsetWidth; // 强制重排
      mobileLevelDisplay.classList.add('level-up-animation');

      setTimeout(() => {
        mobileLevelDisplay.classList.remove('level-up-animation');
        mobileLevelDisplay.classList.add('animate-pulse-once');
      }, 800);
    }
  }, []);

  // 监听语言变更事件
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      setCurrentLanguage(event.detail);
    };

    window.addEventListener('languagechange', handleLanguageChange as EventListener);

    // 初始化语言设置
    const savedLanguage = localStorage.getItem('language') as 'zh' | 'en';
    if (savedLanguage) {
      setCurrentLanguage(savedLanguage);
    } else {
      // 如果没有保存的语言，强制设置为中文
      setCurrentLanguage('zh');
    }

    return () => {
      window.removeEventListener('languagechange', handleLanguageChange as EventListener);
    };
  }, []);

  // ESC键全局处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewingNote) {
          e.preventDefault();
          setViewingNote(null);
          setCurrentView('home');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [viewingNote]);

  // 初始化
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await Promise.all([
          initUserPoints(),
          initDefaultSettings(),
          initDefaultShortcuts()
        ]);

        const checkReminder = async () => {
          const needsReminder = await checkReviewReminder();
          if (needsReminder) {
            setShowReviewReminder(true);
          }
        };
        checkReminder();
      } catch (error) {
        console.error('应用初始化失败:', error);
      }
    };

    initializeApp();

    // 根据屏幕尺寸设置默认编辑器模式
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setEditorMode('edit');
      } else {
        setEditorMode('split');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 创建或更新便签
  const saveNote = async () => {
    if (!editingNote.content || !editingNote.content.trim()) {
      showErrorNotification(t('errorContentEmpty'), t('errorFillNoteContent'));
      return;
    }

    const now = new Date();
    let content = editingNote.content;

    if (editingNote.isPrivate) {
      content = encryptContent(content);
    }

    if (currentNote?.id) {
      await db.notes.update(currentNote.id, {
        content,
        tags: editingNote.tags || [],
        isPrivate: editingNote.isPrivate || false,
        status: 'saved',
        updatedAt: now
      });
    } else {
      const newNote: Note = {
        id: `note-${Date.now()}`,
        content,
        tags: editingNote.tags || [],
        isPrivate: editingNote.isPrivate || false,
        status: 'saved',
        createdAt: now,
        updatedAt: now
      };
      await db.notes.add(newNote);
      
      const pointsResult = await addPoints(1, 'note_created', { noteId: newNote.id });

      // 强制刷新等级显示
      refreshUserPoints();

      // 检查是否升级了
      if (pointsResult.leveledUp) {
        triggerLevelUpAnimation(pointsResult.newLevel);
        showSuccess(
          '🎉 ' + t('levelUp'),
          t('congratsLevelUp', { level: pointsResult.newLevel })
        );
      }
      
      const unlockedAchievements = await checkAchievements();
      if (unlockedAchievements.length > 0) {
        const achievementNames = unlockedAchievements.map(id =>
          ACHIEVEMENTS.find(a => a.id === id)
        ).filter(Boolean);

        achievementNames.forEach(achievement => {
          const points = achievement?.pointsReward || 0;
          showAchievement(
            `🎉 ${achievement?.name}`,
            achievement?.description,
            points
          );
        });
      }
    }

    setEditingNote({
      content: '',
      tags: [],
      isPrivate: false,
      status: 'draft'
    });
    setCurrentNote(null);
    setCurrentView('home');
  };

  const viewNote = (note: Note) => {
    let content = note.content;

    if (note.isPrivate) {
      try {
        content = decryptContent(content);
      } catch (error) {
        showError(t('decryptFailed'), t('incorrectKey'));
        return;
      }
    }

    setViewingNote({
      ...note,
      content
    });
    setCurrentView('view');
  };

  const editNote = (note: Note) => {
    let content = note.content;

    if (note.isPrivate) {
      try {
        content = decryptContent(content);
      } catch (error) {
        showError(t('decryptFailed'), t('incorrectKey'));
        return;
      }
    }

    setCurrentNote(note);
    setEditingNote({
      ...note,
      content
    });
    setCurrentView('editor');
  };

  const deleteNote = async (id: string) => {
    showConfirm(
      t('deleteNote'),
      t('confirmDeleteNote'),
      async () => {
        try {
          await db.notes.delete(id);
        } catch (error) {
          console.error('删除便签失败:', error);
          showErrorNotification(t('deleteFailed'), t('errorRetry'));
        }
      }
    );
  };

  const markAsReviewed = async (note: Note) => {
    await db.notes.update(note.id!, {
      status: 'reviewed',
      lastReviewedAt: new Date()
    });
    const pointsResult = await addPoints(2, 'note_reviewed', { noteId: note.id });

    // 强制刷新等级显示
    refreshUserPoints();

    // 检查是否升级了
    if (pointsResult.leveledUp) {
      triggerLevelUpAnimation(pointsResult.newLevel);
      showSuccess(
        '🎉 ' + t('levelUp'),
        t('congratsLevelUp', { level: pointsResult.newLevel })
      );
    }
    
    const unlockedAchievements = await checkAchievements();
    if (unlockedAchievements.length > 0) {
      const achievementNames = unlockedAchievements.map(id =>
        ACHIEVEMENTS.find(a => a.id === id)
      ).filter(Boolean);

      achievementNames.forEach(achievement => {
        const points = achievement?.pointsReward || 0;
        showAchievement(
          `🎉 ${achievement?.name}`,
          achievement?.description,
          points
        );
      });
    }
  };

  const createTag = async (tagName: string, color: string = '#3b82f6') => {
    if (!tagName.trim()) return;
    
    const existingTag = tags?.find(t => t.name === tagName.trim());
    if (existingTag) {
      return existingTag;
    }

    const newTag = {
      id: `tag-${Date.now()}`,
      name: tagName.trim(),
      color: color,
      createdAt: new Date()
    };

    await db.tags.add(newTag);
    return newTag;
  };

  const createTagAndAddToNote = async () => {
    if (!newTagInput.trim()) return;
    
    const newTag = await createTag(newTagInput.trim(), newTagColor);
    if (newTag) {
      addTagToNote(newTag.name);
      setNewTagInput('');
      setNewTagColor('#3b82f6');
      setShowTagCreator(false);
    }
  };

  const getRandomColor = () => {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const deleteTag = async (id: string) => {
    showConfirm(
      t('deleteTag'),
      t('confirmDeleteTag'),
      async () => {
        await db.tags.delete(id);
      }
    );
  };

  const addTagToNote = (tagName: string) => {
    if (!editingNote.tags) {
      setEditingNote({ ...editingNote, tags: [tagName] });
    } else if (!editingNote.tags.includes(tagName)) {
      setEditingNote({ ...editingNote, tags: [...editingNote.tags, tagName] });
    }
  };

  const removeTagFromNote = (tagName: string) => {
    setEditingNote({
      ...editingNote,
      tags: editingNote.tags?.filter(t => t !== tagName) || []
    });
  };

  const getFilteredNotes = () => {
    if (!notes) return [];
    
    let filtered = notes;

    if (searchQuery) {
      filtered = filtered.filter(note => {
        const searchContent = note.isPrivate ? '' : note.content.toLowerCase();
        return searchContent.includes(searchQuery.toLowerCase()) ||
               note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      });
    }

    if (filterTag) {
      filtered = filtered.filter(note => note.tags.includes(filterTag));
    }

    return filtered;
  };

  // 移动端底部导航栏
  const renderMobileNav = () => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex justify-around items-center h-16">
        <button
          onClick={() => setCurrentView('home')}
          className={`flex flex-col items-center justify-center w-full h-full ${
            currentView === 'home' ? 'text-primary-600' : 'text-gray-600'
          }`}
        >
          <Home size={24} />
          <span className="text-xs mt-1">{t('home')}</span>
        </button>
        
        <button
          onClick={() => setCurrentView('search')}
          className={`flex flex-col items-center justify-center w-full h-full ${
            currentView === 'search' ? 'text-primary-600' : 'text-gray-600'
          }`}
        >
          <Search size={24} />
          <span className="text-xs mt-1">{t('search')}</span>
        </button>

        <button
          onClick={() => {
            setCurrentNote(null);
            setEditingNote({
              content: '',
              tags: [],
              isPrivate: false,
              status: 'draft'
            });
            setCurrentView('editor');
          }}
          className="flex flex-col items-center justify-center w-full h-full text-primary-600"
        >
          <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center -mt-6 shadow-lg">
            <Plus size={28} className="text-white" />
          </div>
        </button>

        <button
          onClick={() => setCurrentView('tags')}
          className={`flex flex-col items-center justify-center w-full h-full ${
            currentView === 'tags' ? 'text-primary-600' : 'text-gray-600'
          }`}
        >
          <Tag size={24} />
          <span className="text-xs mt-1">{t('tags')}</span>
        </button>

        <button
          onClick={() => setCurrentView('settings')}
          className={`flex flex-col items-center justify-center w-full h-full ${
            currentView === 'settings' ? 'text-primary-600' : 'text-gray-600'
          }`}
        >
          <SettingsIcon size={24} />
          <span className="text-xs mt-1">{t('settings')}</span>
        </button>
      </div>
    </div>
  );

  // 桌面端侧边栏
  const renderSidebar = () => (
    <div className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-primary-600">Note Revive</h1>
        <p className="text-sm text-gray-500 mt-1">{t('smartNoteManagement')}</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <button
          onClick={() => setCurrentView('home')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentView === 'home' 
              ? 'bg-primary-50 text-primary-700' 
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Home size={20} />
          <span className="font-medium">{t('home')}</span>
        </button>

        <button
          onClick={() => setCurrentView('search')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentView === 'search' 
              ? 'bg-primary-50 text-primary-700' 
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Search size={20} />
          <span className="font-medium">{t('search')}</span>
        </button>

        <button
          onClick={() => setCurrentView('tags')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentView === 'tags' 
              ? 'bg-primary-50 text-primary-700' 
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Tag size={20} />
          <span className="font-medium">{t('tags')}</span>
        </button>

        <button
          onClick={() => setCurrentView('achievements')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentView === 'achievements'
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Award size={20} />
          <span className="font-medium">{t('achievements')}</span>
        </button>

        <button
          onClick={() => setCurrentView('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentView === 'settings'
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <SettingsIcon size={20} />
          <span className="font-medium">{t('settings')}</span>
        </button>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-r from-primary-500 to-blue-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">{t('level')}</span>
            <span className="text-2xl font-bold animate-pulse-once" id="desktop-level-display">Lv.{userPoints?.level || 1}</span>
          </div>

          {/* 升级进度条 */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs opacity-90">{t('upgradeProgress')}</span>
              <span className="text-xs opacity-90">
                {(userPoints?.totalPoints || 0) % 100}/100
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-500 ease-out"
                style={{ width: `${((userPoints?.totalPoints || 0) % 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TrendingUp size={16} />
            <span className="text-sm">{userPoints?.totalPoints || 0} {t('points')}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // 移动端顶部导航栏（仅在非编辑器视图显示）
  const renderMobileHeader = () => (
    <div className="md:hidden bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary-600">Note Revive</h1>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-primary-500 to-blue-600 rounded-lg px-3 py-1 text-white text-sm animate-pulse-once" id="mobile-level-display">
            {t('grade')}{userPoints?.level || 1} · {userPoints?.totalPoints || 0}{t('pointsUnit')}
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染主页
  const renderHome = () => (
    <div className="p-4 md:p-8 pb-20 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-8 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{t('notes')}</h2>
          <p className="text-gray-500 mt-1 text-sm md:text-base">{t('noteCount', { count: notes?.length || 0 })}</p>
        </div>
        <button
          onClick={() => {
            setCurrentNote(null);
            setEditingNote({
              content: '',
              tags: [],
              isPrivate: false,
              status: 'draft'
            });
            setCurrentView('editor');
          }}
          className="hidden md:flex btn-primary items-center gap-2"
        >
          <Plus size={20} />
          {t('newNote')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {notes?.slice(0, 6).map(note => {
          const preview = note.isPrivate ? t('privateContentEncrypted') : note.content.substring(0, 50) + (note.content.length > 50 ? '...' : '');
          
          return (
          <div
            key={note.id}
            className="card hover:shadow-md transition-shadow group cursor-pointer"
            onClick={() => viewNote(note)}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 flex-1 line-clamp-2">{preview}</h3>
              {note.isPrivate && <Lock size={16} className="text-gray-400 mt-1 flex-shrink-0 ml-2" />}
            </div>

            <div className="text-sm text-gray-600 mb-4 line-clamp-2 md:line-clamp-3">
              {note.isPrivate ? '' : note.content.substring(50, 150)}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {note.tags.map(tag => {
                const tagData = tags?.find(t => t.name === tag);
                return (
                  <span
                    key={tag}
                    className="tag-badge text-xs"
                    style={{
                      backgroundColor: tagData?.color || '#3b82f6',
                      color: getTagTextColor(tagData?.color || '#3b82f6')
                    }}
                  >
                    {tag}
                  </span>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs md:text-sm text-gray-500 mb-3">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(new Date(note.updatedAt), currentLanguage)}
              </span>
              <span className={`px-2 py-1 rounded text-xs ${
                note.status === 'saved' ? 'bg-green-100 text-green-700' :
                note.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                note.status === 'reused' ? 'bg-purple-100 text-purple-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {getStatusText(note.status)}
              </span>
            </div>

            <div
              className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => editNote(note)}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm min-h-[44px]"
              >
                <Edit size={16} />
                {t('edit')}
              </button>
              {note.status !== 'reviewed' && (
                <button
                  onClick={() => markAsReviewed(note)}
                  className="flex-1 px-3 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors flex items-center justify-center gap-2 text-sm min-h-[44px]"
                >
                  <Eye size={16} />
                  {t('review')}
                </button>
              )}
              <button
                onClick={() => deleteNote(note.id!)}
                className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {(!notes || notes.length === 0) && (
        <div className="text-center py-16">
          <div className="text-gray-400 mb-4">
            <Plus size={64} className="mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('noNotesYet')}</h3>
          <p className="text-gray-500 mb-6">{t('startRecording')}</p>
        </div>
      )}
    </div>
  );

  // 渲染搜索页面
  const renderSearch = () => {
    const filteredNotes = getFilteredNotes();

    return (
      <div className="p-4 md:p-8 pb-20 md:pb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">{t('searchNotes')}</h2>

        <div className="mb-6 space-y-4">
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field text-base"
          />

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterTag('')}
              className={`tag-badge min-h-[44px] px-4 ${!filterTag ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              {t('allNotesFilter')}
            </button>
            {tags?.map(tag => (
              <button
                key={tag.id}
                onClick={() => setFilterTag(tag.name)}
                className="tag-badge min-h-[44px] px-4"
                style={{
                  backgroundColor: filterTag === tag.name ? tag.color : '#e5e7eb',
                  color: filterTag === tag.name ? getTagTextColor(tag.color) : '#374151'
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredNotes.map(note => {
            const preview = note.isPrivate ? t('encryptedContent') : note.content.substring(0, 60) + (note.content.length > 60 ? '...' : '');
            
            return (
            <div
              key={note.id}
              className="card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => viewNote(note)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center gap-2 flex-1">
                  <span className="line-clamp-2">{preview}</span>
                  {note.isPrivate && <Lock size={18} className="text-gray-400 flex-shrink-0" />}
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs md:text-sm flex-shrink-0 ml-2 ${
                  note.status === 'saved' ? 'bg-green-100 text-green-700' :
                  note.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                  note.status === 'reused' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {getStatusText(note.status)}
                </span>
              </div>

              <div className="text-sm md:text-base text-gray-600 mb-4 line-clamp-3">
                {note.isPrivate ? '' : note.content.substring(60, 260)}
                {!note.isPrivate && note.content.length > 260 && '...'}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {note.tags.map(tag => {
                  const tagData = tags?.find(t => t.name === tag);
                  return (
                    <span
                      key={tag}
                      className="tag-badge text-xs"
                      style={{
                        backgroundColor: tagData?.color || '#3b82f6',
                        color: getTagTextColor(tagData?.color || '#3b82f6')
                      }}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-xs md:text-sm text-gray-500 flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(new Date(note.updatedAt), currentLanguage)}
                </span>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => editNote(note)}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-1 text-sm min-h-[44px]"
                  >
                    <Edit size={14} />
                    {t('editButton')}
                  </button>
                  {note.status !== 'reviewed' && (
                    <button
                      onClick={() => markAsReviewed(note)}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-primary-50 text-primary-700 rounded hover:bg-primary-100 transition-colors flex items-center justify-center gap-1 text-sm min-h-[44px]"
                    >
                      <Eye size={14} />
                      {t('reviewButton')}
                    </button>
                  )}
                </div>
              </div>
            </div>
            );
          })}

          {filteredNotes.length === 0 && (
            <div className="text-center py-16">
              <Search size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('noRelatedNotesFound')}</h3>
              <p className="text-gray-500">{t('tryDifferentKeywords')}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染标签管理页面
  const renderTags = () => (
    <div className="p-4 md:p-8 pb-20 md:pb-8">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">{t('tagManagementTitle')}</h2>

      <div className="card mb-6">
        <h3 className="text-base md:text-lg font-semibold mb-4">{t('createNewTagTitle')}</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder={t('tagName')}
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            className="input-field flex-1 text-base"
          />
          <input
            type="color"
            value={newTagColor}
            onChange={(e) => setNewTagColor(e.target.value)}
            className="w-full sm:w-20 h-12 rounded-lg cursor-pointer"
          />
          <button onClick={() => createTag(newTagInput, newTagColor)} className="btn-primary min-h-[48px] sm:min-h-[40px]">
            {t('createButton')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tags?.map(tag => {
          const noteCount = notes?.filter(note => note.tags.includes(tag.name)).length || 0;
          
          return (
            <div key={tag.id} className="card group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-12 h-12 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{tag.name}</h3>
                    <p className="text-sm text-gray-500">{t('noteCountWithUnit', { count: noteCount })}</p>
                  </div>
                </div>
                <button
                  onClick={() => deleteTag(tag.id!)}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-lg flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {(!tags || tags.length === 0) && (
        <div className="text-center py-16">
          <Tag size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('noTagsYet')}</h3>
          <p className="text-gray-500">{t('startRecording')}</p>
        </div>
      )}
    </div>
  );

  // 渲染成就页面
  const renderAchievements = () => {
    const unlockedIds = userPoints?.unlockedAchievements || [];

    return (
      <div className="p-4 md:p-8 pb-20 md:pb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">{t('achievementSystem')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          {ACHIEVEMENTS.map(achievement => {
            const unlocked = unlockedIds.includes(achievement.id);
            
            return (
              <div 
                key={achievement.id} 
                className={`card ${unlocked ? 'border-2 border-primary-500' : 'opacity-60'}`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 rounded-lg ${unlocked ? 'bg-primary-100' : 'bg-gray-100'} flex-shrink-0`}>
                    <Award size={28} className={unlocked ? 'text-primary-600' : 'text-gray-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900">{achievement.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{achievement.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary-600">
                    +{achievement.pointsReward} {t('pointsReward')}
                  </span>
                  {unlocked && (
                    <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                      {t('unlocked')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="card">
          <h3 className="text-base md:text-lg font-semibold mb-4">{t('recentActivities')}</h3>
          <div className="space-y-3">
            {recentActivities?.map(activity => (
              <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                    activity.type === 'note_created' ? 'bg-green-100' :
                    activity.type === 'note_reviewed' ? 'bg-blue-100' :
                    activity.type === 'achievement_unlocked' ? 'bg-purple-100' :
                    'bg-gray-100'
                  }`}>
                    {activity.type === 'note_created' && <Plus size={16} className="text-green-600" />}
                    {activity.type === 'note_reviewed' && <Eye size={16} className="text-blue-600" />}
                    {activity.type === 'achievement_unlocked' && <Award size={16} className="text-purple-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.type === 'note_created' && t('activityNoteCreated')}
                      {activity.type === 'note_reviewed' && t('activityNoteReviewed')}
                      {activity.type === 'achievement_unlocked' && t('activityAchievementUnlocked')}
                      {activity.type === 'note_reused' && t('activityNoteReused')}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {formatDate(new Date(activity.timestamp), currentLanguage)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-primary-600 flex-shrink-0 ml-2">+{activity.points}</span>
              </div>
            ))}

            {(!recentActivities || recentActivities.length === 0) && (
              <p className="text-center text-gray-500 py-8">{t('noActivitiesYet')}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 渲染便签详情查看
  const renderNoteView = () => {
    // 将 hook 的使用移到组件顶部，确保每次渲染时 hooks 的顺序一致
    // allTagsForView 已经在组件顶部定义
    const noteTags = (allTagsForView || []).filter(tag => viewingNote?.tags.includes(tag.id || '') || false);

    // 如果不是 view 视图或者没有正在查看的便签，返回 null
    if (currentView !== 'view' || !viewingNote) return null;

    return (
      <div className="h-full flex flex-col bg-white">
        {/* 头部工具栏 */}
        <div className="bg-white border-b border-gray-200 p-3 md:p-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={() => {
                setViewingNote(null);
                setCurrentView('home');
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={t('backToHome')}
            >
              <X size={20} />
            </button>
            <h2 className="text-lg md:text-xl font-semibold text-gray-800 truncate">{t('noteDetails')}</h2>
          </div>
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {viewingNote.isPrivate && (
              <div className="p-2 bg-yellow-100 text-yellow-700 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center" title={t('privateNote')}>
                <Lock size={20} />
              </div>
            )}
            <button
              onClick={() => editNote(viewingNote)}
              className="p-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={t('editNote')}
            >
              <Edit size={20} />
            </button>
            <button
              onClick={() => {
                showConfirm(
                  t('deleteNote'),
                  t('confirmDeleteNotePermanently'),
                  () => {
                    if (viewingNote.id) {
                      db.notes.delete(viewingNote.id);
                      setViewingNote(null);
                      setCurrentView('home');
                      showSuccess(t('deleteSuccess'), t('noteDeleted'));
                    }
                  }
                );
              }}
              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={t('delete')}
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            {/* 便签信息 */}
            <div className="mb-6">
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <Calendar size={16} />
                  {formatDate(viewingNote.createdAt, currentLanguage)}
                </span>
                {viewingNote.updatedAt.getTime() !== viewingNote.createdAt.getTime() && (
                  <span>{t('updatedAt')} {formatDate(viewingNote.updatedAt, currentLanguage)}</span>
                )}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  viewingNote.status === 'saved' ? 'bg-green-100 text-green-700' :
                  viewingNote.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                  viewingNote.status === 'reused' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {getStatusText(viewingNote.status)}
                </span>
              </div>

              {/* 标签 */}
              {noteTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {noteTags.map(tag => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 rounded-full text-sm font-medium text-white"
                      style={{
                        backgroundColor: tag.color,
                        color: getTagTextColor(tag.color)
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 便签内容 */}
            <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({children}) => <h1 className="text-2xl font-bold mb-4 text-gray-900">{children}</h1>,
                  h2: ({children}) => <h2 className="text-xl font-bold mb-3 text-gray-900">{children}</h2>,
                  h3: ({children}) => <h3 className="text-lg font-bold mb-2 text-gray-900">{children}</h3>,
                  p: ({children}) => <p className="mb-4 text-gray-700 leading-relaxed">{children}</p>,
                  ul: ({children}) => <ul className="list-disc pl-6 mb-4 text-gray-700">{children}</ul>,
                  ol: ({children}) => <ol className="list-decimal pl-6 mb-4 text-gray-700">{children}</ol>,
                  li: ({children}) => <li className="mb-2 text-gray-700">{children}</li>,
                  blockquote: ({children}) => (
                    <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-600">{children}</blockquote>
                  ),
                  code: ({inline, className, children}: any) => {
                    // 使用 className 避免未使用变量警告
                    void className; // 避免未使用变量警告
                    return inline ?
                      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm text-gray-800">{children}</code> :
                      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
                        <code className="text-sm text-gray-800">{children}</code>
                      </pre>;
                  },
                }}
              >
                {viewingNote.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染编辑器
  const renderEditor = () => (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 p-3 md:p-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800">{t('quickRecordTitle')}</h2>
        </div>
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          <button
            onClick={() => setEditingNote({ ...editingNote, isPrivate: !editingNote.isPrivate })}
            className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
              editingNote.isPrivate 
                ? 'bg-primary-100 text-primary-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={editingNote.isPrivate ? t('private') : t('public')}
          >
            {editingNote.isPrivate ? <Lock size={20} /> : <Unlock size={20} />}
          </button>
          
          {/* 移动端编辑/预览切换按钮 */}
          <div className="md:hidden flex gap-1">
            <button
              onClick={() => setEditorMode('edit')}
              className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                editorMode === 'edit' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Edit size={20} />
            </button>
            <button
              onClick={() => setEditorMode('preview')}
              className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                editorMode === 'preview' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Eye size={20} />
            </button>
          </div>

          {/* 桌面端预览切换 */}
          <button
            onClick={() => setEditorMode(editorMode === 'split' ? 'edit' : 'split')}
            className="hidden md:flex p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors min-h-[44px] min-w-[44px] items-center justify-center"
            title={editorMode === 'split' ? t('hidePreview') : t('showPreview')}
          >
            {editorMode === 'split' ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
          
          <button
            onClick={saveNote}
            className="btn-primary flex items-center gap-1 md:gap-2 min-h-[44px] px-3 md:px-4"
          >
            <Save size={20} />
            <span className="hidden sm:inline">{t('save')}</span>
          </button>
          <button
            onClick={() => {
              setCurrentView('home');
              setCurrentNote(null);
              setEditingNote({
                content: '',
                tags: [],
                isPrivate: false,
                status: 'draft'
              });
            }}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>
      </div>



      <div className="flex-1 flex overflow-hidden">
        {/* 编辑区 */}
        <div className={`${
          editorMode === 'preview' ? 'hidden' : 
          editorMode === 'split' ? 'w-1/2 border-r border-gray-200' : 
          'w-full'
        }`}>
          <textarea
            placeholder={t('noteInputPlaceholder')}
            value={editingNote.content}
            onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
            className="w-full h-full p-4 md:p-6 outline-none resize-none font-mono text-sm md:text-base"
          />
        </div>
        
        {/* 预览区 */}
        {(editorMode === 'preview' || editorMode === 'split') && (
          <div className={`${editorMode === 'split' ? 'w-1/2' : 'w-full'} p-4 md:p-6 bg-gray-50 overflow-y-auto`}>
            <div className="markdown-preview text-sm md:text-base">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {editingNote.content || t('previewArea')}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* Tag Management Area */}
      <div className="border-t border-gray-200 bg-white">
        <div className="p-3 md:p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Tag size={16} />
            {t('tagManagement')}
          </h3>
          
          {/* Current Note Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {editingNote.tags?.map(tag => {
              const tagData = tags?.find(t => t.name === tag);
              return (
                <span
                  key={tag}
                  className="tag-badge flex items-center gap-1 min-h-[36px] px-3"
                  style={{
                    backgroundColor: tagData?.color || '#3b82f6',
                    color: getTagTextColor(tagData?.color || '#3b82f6')
                  }}
                >
                  {tag}
                  <button
                    onClick={() => removeTagFromNote(tag)}
                    className="hover:bg-white/20 rounded-full p-0.5 min-h-[24px] min-w-[24px] flex items-center justify-center"
                    title={t('deleteTag')}
                  >
                    <X size={14} />
                  </button>
                </span>
              );
            })}
            
            {(!editingNote.tags || editingNote.tags.length === 0) && (
              <span className="text-sm text-gray-500 italic">{t('noTagsYet')}</span>
            )}
          </div>
          
          {/* Tag Operations Area */}
          <div className="space-y-3">
            {/* Existing Tags Select */}
            <div className="flex gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addTagToNote(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="input-field text-base min-h-[44px] flex-1"
              >
                <option value="">{t('selectExistingTag')}</option>
                {tags?.filter(tag => !editingNote.tags?.includes(tag.name)).map(tag => (
                  <option key={tag.id} value={tag.name}>{tag.name}</option>
                ))}
              </select>
              
              <button
                onClick={() => setShowTagCreator(!showTagCreator)}
                className="btn-secondary min-h-[44px] px-4 flex items-center gap-2"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">{t('createNewTag')}</span>
              </button>
            </div>
            
            {/* Tag Creator */}
            {showTagCreator && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder={t('tagName')}
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    className="input-field flex-1 text-base min-h-[44px]"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        createTagAndAddToNote();
                      }
                    }}
                  />
                  
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300"
                      title={t('selectTagColor')}
                    />
                    <button
                      onClick={() => {
                        setNewTagColor(getRandomColor());
                      }}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors min-h-[44px] flex items-center justify-center"
                      title={t('randomColorButton')}
                    >
                      <span className="text-sm">🎲</span>
                    </button>
                    <button
                      onClick={createTagAndAddToNote}
                      className="btn-primary min-h-[44px] px-4"
                      disabled={!newTagInput.trim()}
                    >
                      {t('addButton')}
                    </button>
                  </div>
                </div>
                
                {/* 颜色预览 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{t('preview')}:</span>
                  <div
                    className="w-8 h-8 rounded border-2 border-white shadow-sm"
                    style={{ backgroundColor: newTagColor }}
                  />
                  <span className="text-sm text-gray-700">{newTagInput || t('tagName')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // 回顾提醒弹窗
  const renderReviewReminder = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full animate-slide-up">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye size={32} className="text-primary-600" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{t('reviewTimeArrived')}</h3>
          <p className="text-sm md:text-base text-gray-600">
            {t('reviewReminderDescription')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              setShowReviewReminder(false);
              setCurrentView('search');
            }}
            className="btn-primary flex-1 min-h-[48px]"
          >
            {t('goReview')}
          </button>
          <button
            onClick={() => setShowReviewReminder(false)}
            className="btn-secondary flex-1 min-h-[48px]"
          >
            {t('remindLater')}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-gray-50">
      {currentView !== 'editor' && currentView !== 'view' && renderSidebar()}
      <div className={`flex-1 flex flex-col overflow-hidden ${currentView === 'editor' || currentView === 'view' ? 'w-full' : ''}`}>
        {currentView !== 'editor' && currentView !== 'view' && renderMobileHeader()}
        <div className="flex-1 overflow-y-auto">
          {currentView === 'home' && renderHome()}
          {currentView === 'search' && renderSearch()}
          {currentView === 'tags' && renderTags()}
          {currentView === 'achievements' && renderAchievements()}
          {currentView === 'settings' && (
            <Settings
              onClose={() => setCurrentView('home')}
              onThemeChange={(theme: Theme) => {
                if (settings) {
                  updateSettings({ theme });
                }
              }}
            />
          )}
          {renderNoteView()}
          {currentView === 'editor' && renderEditor()}
        </div>
      </div>
      {currentView !== 'editor' && currentView !== 'settings' && currentView !== 'view' && renderMobileNav()}
      {showReviewReminder && renderReviewReminder()}

      {/* 快捷方式面板 */}
      <ShortcutsPanel
        isOpen={shortcutsOpen || shortcutsState.isOpen}
        searchQuery={shortcutsState.searchQuery}
        selectedIndex={shortcutsState.selectedIndex}
        filteredItems={shortcutsState.filteredItems}
        onClose={() => {
          setShortcutsOpen(false);
          closeShortcutsPanel();
        }}
        onSearch={handleShortcutsSearch}
        onKeyDown={handleShortcutsKeyDown}
        onSelectItem={selectShortcutItem}
      />

      {/* 通知面板 */}
      {isPanelOpen && (
        <NotificationPanel
          notifications={notifications}
          onClose={removeNotification}
          onClearAll={clearNotifications}
        />
      )}

      {/* 浮动通知卡片 */}
      {notifications
        .filter(n => !n.autoClose)
        .slice(-3)
        .map(notification => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))
      }

      {/* 现代弹窗组件 */}
      <DialogComponent />
    </div>
  );
}

export default App;
