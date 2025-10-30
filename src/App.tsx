import { useEffect, useState } from 'react';
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
import ShortcutsPanel from './components/ShortcutsPanel';
import Settings from './components/Settings';
import NotificationPanel, { NotificationCard } from './components/NotificationPanel';
import { getTagTextColor } from './utils/colorContrast';

function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
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
      console.error('导出数据失败:', error);
      showError('导出失败', '请重试');
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
    showError,
    showAchievement,
    removeNotification,
    clearNotifications
  } = useNotifications({
    maxNotifications: 10,
    defaultDuration: 5000,
    enablePanel: true
  });

  // 加载数据
  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray());
  const tags = useLiveQuery(() => db.tags.orderBy('createdAt').toArray());
  const userPoints = useLiveQuery(() => db.userPoints.get(1));
  const recentActivities = useLiveQuery(() =>
    db.activities.orderBy('timestamp').reverse().limit(10).toArray()
  );

  
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
      showError('内容为空', '请填写便签内容');
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
      
      await addPoints(1, 'note_created', { noteId: newNote.id });
      
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

  const editNote = (note: Note) => {
    let content = note.content;
    
    if (note.isPrivate) {
      try {
        content = decryptContent(content);
      } catch (error) {
        alert('解密失败，可能密钥不正确');
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
    if (window.confirm('确定要删除这条便签吗？')) {
      try {
        await db.notes.delete(id);
      } catch (error) {
        console.error('删除便签失败:', error);
        showError('删除失败', '请重试');
      }
    }
  };

  const markAsReviewed = async (note: Note) => {
    await db.notes.update(note.id!, {
      status: 'reviewed',
      lastReviewedAt: new Date()
    });
    await addPoints(2, 'note_reviewed', { noteId: note.id });
    
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
    if (confirm('确定要删除这个标签吗？相关便签不会被删除。')) {
      await db.tags.delete(id);
    }
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
          <span className="text-xs mt-1">主页</span>
        </button>
        
        <button
          onClick={() => setCurrentView('search')}
          className={`flex flex-col items-center justify-center w-full h-full ${
            currentView === 'search' ? 'text-primary-600' : 'text-gray-600'
          }`}
        >
          <Search size={24} />
          <span className="text-xs mt-1">搜索</span>
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
          <span className="text-xs mt-1">标签</span>
        </button>

        <button
          onClick={() => setCurrentView('settings')}
          className={`flex flex-col items-center justify-center w-full h-full ${
            currentView === 'settings' ? 'text-primary-600' : 'text-gray-600'
          }`}
        >
          <SettingsIcon size={24} />
          <span className="text-xs mt-1">设置</span>
        </button>
      </div>
    </div>
  );

  // 桌面端侧边栏
  const renderSidebar = () => (
    <div className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-primary-600">Note Revive</h1>
        <p className="text-sm text-gray-500 mt-1">智能便签管理</p>
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
          <span className="font-medium">主页</span>
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
          <span className="font-medium">搜索</span>
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
          <span className="font-medium">标签</span>
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
          <span className="font-medium">成就</span>
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
          <span className="font-medium">设置</span>
        </button>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-r from-primary-500 to-blue-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">等级</span>
            <span className="text-2xl font-bold">Lv.{userPoints?.level || 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} />
            <span className="text-sm">{userPoints?.totalPoints || 0} 积分</span>
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
          <div className="bg-gradient-to-r from-primary-500 to-blue-600 rounded-lg px-3 py-1 text-white text-sm">
            Lv.{userPoints?.level || 1} · {userPoints?.totalPoints || 0}分
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
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">我的便签</h2>
          <p className="text-gray-500 mt-1 text-sm md:text-base">共 {notes?.length || 0} 条便签</p>
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
          新建便签
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {notes?.slice(0, 6).map(note => {
          const preview = note.isPrivate ? '私密内容已加密' : note.content.substring(0, 50) + (note.content.length > 50 ? '...' : '');
          
          return (
          <div key={note.id} className="card hover:shadow-md transition-shadow group">
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
                {new Date(note.updatedAt).toLocaleDateString('zh-CN')}
              </span>
              <span className={`px-2 py-1 rounded text-xs ${
                note.status === 'saved' ? 'bg-green-100 text-green-700' :
                note.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                note.status === 'reused' ? 'bg-purple-100 text-purple-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {note.status === 'saved' ? '已保存' :
                 note.status === 'reviewed' ? '已回顾' :
                 note.status === 'reused' ? '已复用' : '草稿'}
              </span>
            </div>

            <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => editNote(note)}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm min-h-[44px]"
              >
                <Edit size={16} />
                编辑
              </button>
              {note.status !== 'reviewed' && (
                <button
                  onClick={() => markAsReviewed(note)}
                  className="flex-1 px-3 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors flex items-center justify-center gap-2 text-sm min-h-[44px]"
                >
                  <Eye size={16} />
                  回顾
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
          <h3 className="text-xl font-semibold text-gray-700 mb-2">还没有便签</h3>
          <p className="text-gray-500 mb-6">点击底部加号开始记录你的想法吧</p>
        </div>
      )}
    </div>
  );

  // 渲染搜索页面
  const renderSearch = () => {
    const filteredNotes = getFilteredNotes();

    return (
      <div className="p-4 md:p-8 pb-20 md:pb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">搜索便签</h2>

        <div className="mb-6 space-y-4">
          <input
            type="text"
            placeholder="搜索内容或标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field text-base"
          />

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterTag('')}
              className={`tag-badge min-h-[44px] px-4 ${!filterTag ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              全部
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
            const preview = note.isPrivate ? '私密内容已加密' : note.content.substring(0, 60) + (note.content.length > 60 ? '...' : '');
            
            return (
            <div key={note.id} className="card hover:shadow-md transition-shadow">
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
                  {note.status === 'saved' ? '已保存' :
                   note.status === 'reviewed' ? '已回顾' :
                   note.status === 'reused' ? '已复用' : '草稿'}
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
                  {new Date(note.updatedAt).toLocaleDateString('zh-CN')}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => editNote(note)}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-1 text-sm min-h-[44px]"
                  >
                    <Edit size={14} />
                    编辑
                  </button>
                  {note.status !== 'reviewed' && (
                    <button
                      onClick={() => markAsReviewed(note)}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-primary-50 text-primary-700 rounded hover:bg-primary-100 transition-colors flex items-center justify-center gap-1 text-sm min-h-[44px]"
                    >
                      <Eye size={14} />
                      回顾
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
              <h3 className="text-xl font-semibold text-gray-700 mb-2">没有找到相关便签</h3>
              <p className="text-gray-500">尝试使用其他关键词或标签</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染标签管理页面
  const renderTags = () => (
    <div className="p-4 md:p-8 pb-20 md:pb-8">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">标签管理</h2>

      <div className="card mb-6">
        <h3 className="text-base md:text-lg font-semibold mb-4">创建新标签</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="标签名称"
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
            创建
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
                    <p className="text-sm text-gray-500">{noteCount} 条便签</p>
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
          <h3 className="text-xl font-semibold text-gray-700 mb-2">还没有标签</h3>
          <p className="text-gray-500">创建标签来更好地组织你的便签</p>
        </div>
      )}
    </div>
  );

  // 渲染成就页面
  const renderAchievements = () => {
    const unlockedIds = userPoints?.unlockedAchievements || [];

    return (
      <div className="p-4 md:p-8 pb-20 md:pb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">成就系统</h2>

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
                    +{achievement.pointsReward} 积分
                  </span>
                  {unlocked && (
                    <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                      已解锁
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="card">
          <h3 className="text-base md:text-lg font-semibold mb-4">最近活动</h3>
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
                      {activity.type === 'note_created' && '创建便签'}
                      {activity.type === 'note_reviewed' && '回顾便签'}
                      {activity.type === 'achievement_unlocked' && '解锁成就'}
                      {activity.type === 'note_reused' && '复用便签'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {new Date(activity.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-primary-600 flex-shrink-0 ml-2">+{activity.points}</span>
              </div>
            ))}

            {(!recentActivities || recentActivities.length === 0) && (
              <p className="text-center text-gray-500 py-8">还没有活动记录</p>
            )}
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
          <h2 className="text-lg md:text-xl font-semibold text-gray-800">快速记录</h2>
        </div>
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          <button
            onClick={() => setEditingNote({ ...editingNote, isPrivate: !editingNote.isPrivate })}
            className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
              editingNote.isPrivate 
                ? 'bg-primary-100 text-primary-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={editingNote.isPrivate ? '私密' : '公开'}
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
            title={editorMode === 'split' ? '隐藏预览' : '显示预览'}
          >
            {editorMode === 'split' ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
          
          <button
            onClick={saveNote}
            className="btn-primary flex items-center gap-1 md:gap-2 min-h-[44px] px-3 md:px-4"
          >
            <Save size={20} />
            <span className="hidden sm:inline">保存</span>
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
            placeholder="在此输入便签内容（支持Markdown格式）..."
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
                {editingNote.content || '*预览区域*'}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* 标签管理区域 - 移到编辑器底部 */}
      <div className="border-t border-gray-200 bg-white">
        <div className="p-3 md:p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Tag size={16} />
            标签管理
          </h3>
          
          {/* 当前便签的标签 */}
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
                    title="删除标签"
                  >
                    <X size={14} />
                  </button>
                </span>
              );
            })}
            
            {(!editingNote.tags || editingNote.tags.length === 0) && (
              <span className="text-sm text-gray-500 italic">还没有标签</span>
            )}
          </div>
          
          {/* 标签操作区域 */}
          <div className="space-y-3">
            {/* 现有标签选择 */}
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
                <option value="">从现有标签中选择...</option>
                {tags?.filter(tag => !editingNote.tags?.includes(tag.name)).map(tag => (
                  <option key={tag.id} value={tag.name}>{tag.name}</option>
                ))}
              </select>
              
              <button
                onClick={() => setShowTagCreator(!showTagCreator)}
                className="btn-secondary min-h-[44px] px-4 flex items-center gap-2"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">新建标签</span>
              </button>
            </div>
            
            {/* 标签创建器 */}
            {showTagCreator && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="标签名称"
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
                      title="选择标签颜色"
                    />
                    <button
                      onClick={() => {
                        setNewTagColor(getRandomColor());
                      }}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors min-h-[44px] flex items-center justify-center"
                      title="随机颜色"
                    >
                      <span className="text-sm">🎲</span>
                    </button>
                    <button
                      onClick={createTagAndAddToNote}
                      className="btn-primary min-h-[44px] px-4"
                      disabled={!newTagInput.trim()}
                    >
                      添加
                    </button>
                  </div>
                </div>
                
                {/* 颜色预览 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">预览：</span>
                  <div
                    className="w-8 h-8 rounded border-2 border-white shadow-sm"
                    style={{ backgroundColor: newTagColor }}
                  />
                  <span className="text-sm text-gray-700">{newTagInput || '标签名称'}</span>
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
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">回顾时间到了</h3>
          <p className="text-sm md:text-base text-gray-600">
            你有一些超过7天未回顾的便签，现在回顾可以获得额外积分哦！
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
            去回顾
          </button>
          <button
            onClick={() => setShowReviewReminder(false)}
            className="btn-secondary flex-1 min-h-[48px]"
          >
            稍后提醒
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-gray-50">
      {currentView !== 'editor' && renderSidebar()}
      <div className={`flex-1 flex flex-col overflow-hidden ${currentView === 'editor' ? 'w-full' : ''}`}>
        {currentView !== 'editor' && renderMobileHeader()}
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
          {currentView === 'editor' && renderEditor()}
        </div>
      </div>
      {currentView !== 'editor' && currentView !== 'settings' && renderMobileNav()}
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
    </div>
  );
}

export default App;
