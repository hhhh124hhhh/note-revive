// 翻译接口定义
export interface Translations {
  // 通用
  loading: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  enable: string;
  view: string;
  back: string;
  confirm: string;
  success: string;
  error: string;
  warning: string;
  ok: string;
  close: string;

  // 导航
  home: string;
  search: string;
  tags: string;
  achievements: string;
  settings: string;
  newNote: string;

  // 便签
  notes: string;
  noteCount: string;
  noNotes: string;
  noteCreated: string;
  noteSaved: string;
  noteDeleted: string;
  noteReviewed: string;
  noteDetails: string;
  privateNote: string;
  publicNote: string;
  draft: string;
  saved: string;
  reviewed: string;
  reused: string;

  // 状态
  statusDraft: string;
  statusSaved: string;
  statusReviewed: string;
  statusReused: string;

  // 搜索
  searchPlaceholder: string;
  searchNotes: string;
  filterByTag: string;
  all: string;
  noResults: string;

  // 标签
  tagsManage: string;
  noTags: string;
  createTag: string;
  tagName: string;
  tagColor: string;
  tagExists: string;
  tagSelectColor: string;
  randomColorButton: string;
  tagManagement: string;
  selectTagColor: string;

  // 成就系统
  achievementUnlocked: string;
  achievementsTitle: string;
  noAchievements: string;
  points: string;
  level: string;
  currentLevel: string;
  levelUp: string;
  upgradeProgress: string;
  congratsLevelUp: string;
  currentPoints: string;

  // 编辑器
  editor: string;
  preview: string;
  split: string;
  content: string;
  isPrivate: string;
  isPublic: string;
  hidePreview: string;
  showPreview: string;
  editorPlaceholder: string;
  quickRecordTitle: string;
  tagManagementArea: string;
  createButton: string;

  // 设置
  theme: string;
  fontSize: string;
  small: string;
  medium: string;
  large: string;
  language: string;
  export: string;
  shortcuts: string;
  autoSave: string;
  exportFormat: string;
  settingsDescription: string;
  basicSettings: string;
  dataManagement: string;
  aiSettings: string;

  // AI功能
  aiAssistant: string;
  aiFeatures: string;
  smartCategorization: string;
  contentSummary: string;
  tagSuggestions: string;
  searchEnhancement: string;
  aiFeaturesComingSoon: string;
  smartNoteCategorization: string;
  contentSummarization: string;
  smartSearch: string;
  noteRecommendations: string;

  // 通知和时间
  notificationCenter: string;
  clearAll: string;
  notificationCount: string;
  autoCloseEnabled: string;
  foundResults: string;
  totalNotifications: string;
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;

  // 回顾提醒
  reviewTimeUp: string;
  reviewTimeUpMessage: string;
  goReview: string;
  remindLater: string;

  // 快捷键面板
  actionPanel: string;
  pressToOpen: string;
  newNoteShortcut: string;
  searchNoteShortcut: string;
  openSettingsShortcut: string;
  toggleThemeShortcut: string;
  exportDataShortcut: string;
  navigation: string;
  select: string;
  enterCommandOrSearch: string;
  noCommandsFound: string;
  tryOtherKeywords: string;
  quickActionPanel: string;
  pressCtrlKToOpen: string;

  // 对话框按钮和消息
  deleteNoteConfirm: string;
  deleteNoteSuccess: string;
  deleteNoteError: string;
  confirmDeleteNote: string;
  confirmDeleteNotePermanently: string;
  deleteSuccess: string;
  noteCreateSuccess: string;
  noteCreateError: string;
  noteUpdateSuccess: string;
  noteUpdateError: string;
  tagCreateSuccess: string;
  tagCreateError: string;
  settingsSaved: string;
  settingsSaveError: string;
  languageApplied: string;
  fontSizeApplied: string;
  themeApplied: string;
  settingsApplied: string;
  savingInProgress: string;

  // 错误消息
  loadSettingsFailed: string;
  saveFailed: string;
  settingsSaveFailed: string;
  errorContentEmpty: string;
  errorFillNoteContent: string;
  deleteFailed: string;
  errorRetry: string;
  shortcutExists: string;
  saveFailedRetry: string;
  resetFailed: string;
  decryptFailed: string;
  incorrectKey: string;
  exportFailed: string;

  // 新增的翻译键
  shortcutExample: string;
  resetShortcuts: string;
  confirmResetShortcuts: string;
  clearData: string;
  confirmClearData: string;
  dangerousOperationsWarning: string;
  featureInDevelopment: string;
  clearDataFeatureComingSoon: string;
  startRecording: string;
  reviewTimeArrived: string;
  reviewReminderDescription: string;
  selectExistingTag: string;
  previewArea: string;
  noteInputPlaceholder: string;
  smartNoteManagement: string;
  currentTheme: string;
  current: string;
  languageSettings: string;
  chinese: string;
  shortcutsSettings: string;

  // 按钮和操作
  editButton: string;
  reviewButton: string;
  review: string;
  addButton: string;
  backToHome: string;
  editNote: string;
  tagsInfo: string;
  contentArea: string;
  deleteTag: string;
  existingTagsSelect: string;
  tagCreator: string;
  allNotesFilter: string;
  gradeSuffix: string;
  grade: string;
  openSettings: string;
  toggleTheme: string;
  exportData: string;
  createNewNoteDescription: string;
  searchExistingNotesDescription: string;
  openAppSettingsDescription: string;
  toggleAppThemeDescription: string;
  exportNoteDataDescription: string;

  // 文本和单位
  pointsUnit: string;
  encryptedContent: string;
  noteCountUnit: string;
  noTagsYet: string;
  pointsReward: string;
  unlocked: string;

  // 主题名称
  lightTheme: string;
  darkTheme: string;
  blueTheme: string;
  greenTheme: string;
  purpleTheme: string;
  orangeTheme: string;

  // 活动记录
  activityNoteCreated: string;
  activityNoteReviewed: string;
  activityAchievementUnlocked: string;
  activityNoteReused: string;
  updatedAt: string;

  // 字体设置
  smallFont: string;
  mediumFont: string;
  largeFont: string;
  smallFontPreview: string;
  mediumFontPreview: string;
  largeFontPreview: string;
  fontSizePreview: string;

  // 快捷键操作描述
  toggleShortcutsAction: string;
  newNoteAction: string;
  searchAction: string;
  saveAction: string;
  settingsAction: string;
  toggleThemeAction: string;
  exportDataAction: string;
  focusSearchAction: string;
  navigate: string;

  // 其他缺失的翻译键
  deleteNote: string;
  confirmDeleteTag: string;
  privateContentEncrypted: string;
  noNotesYet: string;
  noRelatedNotesFound: string;
  tryDifferentKeywords: string;
  tagManagementTitle: string;
  createNewTagTitle: string;
  noteCountWithUnit: string;
  achievementSystem: string;
  recentActivities: string;
  noActivitiesYet: string;
  quickRecord: string;
  private: string;
  public: string;
  createNewTag: string;
  themeSettings: string;
  fontSettings: string;
  exportNoteData: string;
  otherSettings: string;
  autoSaveDescription: string;
  resetToDefault: string;
  dangerousOperations: string;
  clearAllData: string;
  enableAIFeatures: string;
  enableAIDescription: string;
}

// 中文翻译
const zh: Translations = {
  // 通用
  loading: '加载中...',
  save: '保存',
  cancel: '取消',
  delete: '删除',
  edit: '编辑',
  enable: '启用',
  view: '查看',
  back: '返回',
  confirm: '确认',
  success: '成功',
  error: '错误',
  warning: '警告',
  ok: '确定',
  close: '关闭',

  // 导航
  home: '主页',
  search: '搜索',
  tags: '标签',
  achievements: '成就',
  settings: '设置',
  newNote: '新便签',

  // 便签
  notes: '便签',
  noteCount: '共 {count} 条便签',
  noNotes: '暂无便签',
  noteCreated: '便签创建成功',
  noteSaved: '便签保存成功',
  noteDeleted: '便签删除成功',
  noteReviewed: '便签回顾成功',
  noteDetails: '便签详情',
  privateNote: '私密便签',
  publicNote: '公开便签',
  draft: '草稿',
  saved: '已保存',
  reviewed: '已回顾',
  reused: '已复用',

  // 状态
  statusDraft: '草稿',
  statusSaved: '已保存',
  statusReviewed: '已回顾',
  statusReused: '已复用',

  // 搜索
  searchPlaceholder: '搜索便签...',
  searchNotes: '搜索便签',
  filterByTag: '按标签筛选',
  all: '全部',
  noResults: '没有找到相关便签',

  // 标签
  tagsManage: '标签管理',
  noTags: '暂无标签',
  createTag: '创建标签',
  tagName: '标签名称',
  tagColor: '标签颜色',
  tagExists: '标签已存在',
  tagSelectColor: '选择标签颜色',
  randomColorButton: '随机颜色',
  tagManagement: '标签管理',
  selectTagColor: '选择标签颜色',

  // 成就系统
  achievementUnlocked: '成就解锁！',
  achievementsTitle: '成就系统',
  noAchievements: '暂无成就',
  points: '积分',
  level: '等级',
  currentLevel: '当前等级',
  levelUp: '升级',
  upgradeProgress: '升级进度',
  congratsLevelUp: '恭喜升级！您已升级到 Lv.{level}！',
  currentPoints: '{current}/100',

  // 编辑器
  editor: '编辑器',
  preview: '预览',
  split: '分屏',
  content: '内容',
  isPrivate: '私密',
  isPublic: '公开',
  hidePreview: '隐藏预览',
  showPreview: '显示预览',
  editorPlaceholder: '在此输入便签内容（支持Markdown格式）...',
  quickRecordTitle: '快速记录',
  tagManagementArea: '标签管理区域',
  createButton: '创建',

  // 设置
  theme: '主题',
  fontSize: '字体大小',
  small: '小',
  medium: '中',
  large: '大',
  language: '语言',
  export: '导出',
  shortcuts: '快捷键',
  autoSave: '自动保存',
  exportFormat: '导出格式',
  settingsDescription: '自定义应用偏好和快捷键',
  basicSettings: '基础设置',
  dataManagement: '数据管理',
  aiSettings: 'AI设置',

  // AI功能
  aiAssistant: 'AI助手',
  aiFeatures: 'AI功能',
  smartCategorization: '智能分类',
  contentSummary: '内容总结',
  tagSuggestions: '标签建议',
  searchEnhancement: '搜索增强',
  aiFeaturesComingSoon: 'AI功能即将推出',
  smartNoteCategorization: '智能便签分类',
  contentSummarization: '内容总结',
  smartSearch: '智能搜索',
  noteRecommendations: '便签推荐',

  // 通知和时间
  notificationCenter: '通知中心',
  clearAll: '清除全部',
  notificationCount: '共 {count} 条通知',
  autoCloseEnabled: '自动关闭已启用',
  foundResults: '找到 {count} 个结果',
  totalNotifications: '共 {count} 条通知',
  justNow: '刚刚',
  minutesAgo: '{count}分钟前',
  hoursAgo: '{count}小时前',
  daysAgo: '{days} 天前',

  // 回顾提醒
  reviewTimeUp: '回顾时间到了',
  reviewTimeUpMessage: '你有一些超过7天未回顾的便签，现在回顾可以获得额外积分哦！',
  goReview: '去回顾',
  remindLater: '稍后提醒',

  // 快捷键面板
  actionPanel: '操作面板',
  pressToOpen: '按键打开',
  newNoteShortcut: '新建便签',
  searchNoteShortcut: '搜索便签',
  openSettingsShortcut: '打开设置',
  toggleThemeShortcut: '切换主题',
  exportDataShortcut: '导出数据',
  navigation: '导航',
  select: '选择',
  enterCommandOrSearch: '输入命令或搜索...',
  noCommandsFound: '没有找到相关命令',
  tryOtherKeywords: '尝试使用其他关键词',
  quickActionPanel: '快速操作面板',
  pressCtrlKToOpen: '按 Ctrl+K 随时打开',

  // 对话框按钮和消息
  deleteNoteConfirm: '确定要删除这条便签吗？',
  deleteNoteSuccess: '便签删除成功',
  deleteNoteError: '删除便签失败',
  confirmDeleteNote: '确定要删除这条便签吗？',
  confirmDeleteNotePermanently: '确定要删除这个便签吗？此操作无法撤销。',
  deleteSuccess: '删除成功',
  noteCreateSuccess: '便签创建成功',
  noteCreateError: '便签创建失败',
  noteUpdateSuccess: '便签更新成功',
  noteUpdateError: '便签更新失败',
  tagCreateSuccess: '标签创建成功',
  tagCreateError: '标签创建失败',
  settingsSaved: '设置保存成功',
  settingsSaveError: '设置保存失败',
  languageApplied: '语言设置已应用',
  fontSizeApplied: '字体设置已应用',
  themeApplied: '主题设置已应用',
  settingsApplied: '设置已应用',
  savingInProgress: '保存中...',

  // 错误消息
  loadSettingsFailed: '加载设置失败',
  saveFailed: '保存失败',
  settingsSaveFailed: '设置保存失败，请重试',
  errorContentEmpty: '内容为空',
  errorFillNoteContent: '请填写便签内容',
  deleteFailed: '删除失败',
  errorRetry: '请重试',
  shortcutExists: '快捷键已存在',
  saveFailedRetry: '保存失败，请重试',
  resetFailed: '重置失败',
  decryptFailed: '解密失败',
  incorrectKey: '可能密钥不正确',
  exportFailed: '导出失败',

  // 新增的翻译键
  shortcutExample: '例如: Ctrl+N',
  resetShortcuts: '重置快捷键',
  confirmResetShortcuts: '确定要重置所有快捷键为默认设置吗？',
  clearData: '清除数据',
  confirmClearData: '确定要清除所有便签数据吗？此操作无法撤销！',
  dangerousOperationsWarning: '以下操作不可恢复，请谨慎操作',
  featureInDevelopment: '功能开发中',
  clearDataFeatureComingSoon: '清除数据功能即将推出',
  startRecording: '点击底部加号开始记录你的想法吧',
  reviewTimeArrived: '回顾时间到了',
  reviewReminderDescription: '你有一些超过7天未回顾的便签，现在回顾可以获得额外积分哦！',
  selectExistingTag: '从现有标签中选择...',
  previewArea: '*预览区域*',
  noteInputPlaceholder: '在此输入便签内容（支持Markdown格式）...',
  smartNoteManagement: '智能便签管理',
  currentTheme: '当前主题',
  current: '当前',
  languageSettings: '语言设置',
  chinese: '中文',
  shortcutsSettings: '快捷键设置',

  // 按钮和操作
  editButton: '编辑',
  reviewButton: '回顾',
  review: '回顾',
  addButton: '添加',
  backToHome: '返回',
  editNote: '编辑',
  tagsInfo: '标签',
  contentArea: '内容区域',
  deleteTag: '删除标签',
  existingTagsSelect: '现有标签选择',
  tagCreator: '标签创建器',
  allNotesFilter: '全部',
  gradeSuffix: '级',
  grade: 'Lv.',
  openSettings: '打开设置',
  toggleTheme: '切换主题',
  exportData: '导出数据',
  createNewNoteDescription: '创建一个新的便签',
  searchExistingNotesDescription: '搜索现有便签',
  openAppSettingsDescription: '打开应用设置',
  toggleAppThemeDescription: '切换应用主题',
  exportNoteDataDescription: '导出便签数据',

  // 文本和单位
  pointsUnit: '分',
  encryptedContent: '私密内容已加密',
  noteCountUnit: '条便签',
  noTagsYet: '还没有标签',
  pointsReward: '积分',
  unlocked: '已解锁',

  // 主题名称
  lightTheme: '亮色主题',
  darkTheme: '暗色主题',
  blueTheme: '蓝色主题',
  greenTheme: '绿色主题',
  purpleTheme: '紫色主题',
  orangeTheme: '橙色主题',

  // 活动记录
  activityNoteCreated: '创建便签',
  activityNoteReviewed: '回顾便签',
  activityAchievementUnlocked: '解锁成就',
  activityNoteReused: '复用便签',
  updatedAt: '更新于',

  // 字体设置
  smallFont: '小号',
  mediumFont: '中号',
  largeFont: '大号',
  smallFontPreview: '小号字体预览',
  mediumFontPreview: '中号字体预览',
  largeFontPreview: '大号字体预览',
  fontSizePreview: '字体预览',

  // 快捷键操作描述
  toggleShortcutsAction: '打开快捷面板',
  newNoteAction: '新建便签',
  searchAction: '快速搜索',
  saveAction: '保存便签',
  settingsAction: '打开设置',
  toggleThemeAction: '切换主题',
  exportDataAction: '导出数据',
  focusSearchAction: '聚焦搜索框',
  navigate: '导航',

  // 其他缺失的翻译键
  deleteNote: '删除便签',
  confirmDeleteTag: '确定要删除这个标签吗？',
  privateContentEncrypted: '私密内容已加密',
  noNotesYet: '还没有便签',
  noRelatedNotesFound: '没有找到相关便签',
  tryDifferentKeywords: '尝试使用其他关键词或标签',
  tagManagementTitle: '标签管理',
  createNewTagTitle: '创建新标签',
  noteCountWithUnit: '共 {count} 条便签',
  achievementSystem: '成就系统',
  recentActivities: '最近活动',
  noActivitiesYet: '还没有活动记录',
  quickRecord: '快速记录',
  private: '私密',
  public: '公开',
  createNewTag: '创建新标签',
  themeSettings: '主题设置',
  fontSettings: '字体设置',
  exportNoteData: '导出便签数据',
  otherSettings: '其他设置',
  autoSaveDescription: '自动保存功能可以防止数据丢失',
  resetToDefault: '重置为默认',
  dangerousOperations: '危险操作',
  clearAllData: '清除所有数据',
  enableAIFeatures: '启用 AI 功能',
  enableAIDescription: '启用智能助手、分类和搜索功能',
};

// 英文翻译
const en: Translations = {
  // 通用
  loading: 'Loading...',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  enable: 'Enable',
  view: 'View',
  back: 'Back',
  confirm: 'Confirm',
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  ok: 'OK',
  close: 'Close',

  // 导航
  home: 'Home',
  search: 'Search',
  tags: 'Tags',
  achievements: 'Achievements',
  settings: 'Settings',
  newNote: 'New Note',

  // 便签
  notes: 'Notes',
  noteCount: 'Total {count} notes',
  noNotes: 'No notes',
  noteCreated: 'Note created successfully',
  noteSaved: 'Note saved successfully',
  noteDeleted: 'Note deleted successfully',
  noteReviewed: 'Note reviewed successfully',
  noteDetails: 'Note Details',
  privateNote: 'Private Note',
  publicNote: 'Public Note',
  draft: 'Draft',
  saved: 'Saved',
  reviewed: 'Reviewed',
  reused: 'Reused',

  // 状态
  statusDraft: 'Draft',
  statusSaved: 'Saved',
  statusReviewed: 'Reviewed',
  statusReused: 'Reused',

  // 搜索
  searchPlaceholder: 'Search notes...',
  searchNotes: 'Search Notes',
  filterByTag: 'Filter by tag',
  all: 'All',
  noResults: 'No results found',

  // 标签
  tagsManage: 'Manage Tags',
  noTags: 'No tags',
  createTag: 'Create Tag',
  tagName: 'Tag Name',
  tagColor: 'Tag Color',
  tagExists: 'Tag already exists',
  tagSelectColor: 'Select Tag Color',
  randomColorButton: 'Random Color',
  tagManagement: 'Tag Management',
  selectTagColor: 'Select Tag Color',

  // 成就系统
  achievementUnlocked: 'Achievement Unlocked!',
  achievementsTitle: 'Achievements',
  noAchievements: 'No achievements yet',
  points: 'Points',
  level: 'Level',
  currentLevel: 'Current Level',
  levelUp: 'Level Up',
  upgradeProgress: 'Upgrade Progress',
  congratsLevelUp: 'Congratulations! You have reached Level {level}!',
  currentPoints: '{current}/100',

  // 编辑器
  editor: 'Editor',
  preview: 'Preview',
  split: 'Split',
  content: 'Content',
  isPrivate: 'Private',
  isPublic: 'Public',
  hidePreview: 'Hide Preview',
  showPreview: 'Show Preview',
  editorPlaceholder: 'Enter note content here (Markdown format supported)...',
  quickRecordTitle: 'Quick Record',
  tagManagementArea: 'Tag Management Area',
  createButton: 'Create',

  // 设置
  theme: 'Theme',
  fontSize: 'Font Size',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  language: 'Language',
  export: 'Export',
  shortcuts: 'Shortcuts',
  autoSave: 'Auto Save',
  exportFormat: 'Export Format',
  settingsDescription: 'Customize app preferences and shortcuts',
  basicSettings: 'Basic Settings',
  dataManagement: 'Data Management',
  aiSettings: 'AI Settings',

  // AI功能
  aiAssistant: 'AI Assistant',
  aiFeatures: 'AI Features',
  smartCategorization: 'Smart Categorization',
  contentSummary: 'Content Summary',
  tagSuggestions: 'Tag Suggestions',
  searchEnhancement: 'Search Enhancement',
  aiFeaturesComingSoon: 'AI features coming soon',
  smartNoteCategorization: 'Smart Note Categorization',
  contentSummarization: 'Content Summarization',
  smartSearch: 'Smart Search',
  noteRecommendations: 'Note Recommendations',

  // 通知和时间
  notificationCenter: 'Notification Center',
  clearAll: 'Clear All',
  notificationCount: 'Total {count} notifications',
  autoCloseEnabled: 'Auto close enabled',
  foundResults: 'Found {count} results',
  totalNotifications: 'Total {count} notifications',
  justNow: 'Just now',
  minutesAgo: '{count} minutes ago',
  hoursAgo: '{count} hours ago',
  daysAgo: '{days} days ago',

  // 回顾提醒
  reviewTimeUp: 'Review Time',
  reviewTimeUpMessage: 'You have some notes that haven\'t been reviewed for over 7 days. Review them now for extra points!',
  goReview: 'Go Review',
  remindLater: 'Remind Later',

  // 快捷键面板
  actionPanel: 'Action Panel',
  pressToOpen: 'Press to Open',
  newNoteShortcut: 'New Note',
  searchNoteShortcut: 'Search Notes',
  openSettingsShortcut: 'Open Settings',
  toggleThemeShortcut: 'Toggle Theme',
  exportDataShortcut: 'Export Data',
  navigation: 'Navigate',
  select: 'Select',
  enterCommandOrSearch: 'Enter command or search...',
  noCommandsFound: 'No commands found',
  tryOtherKeywords: 'Try using other keywords',
  quickActionPanel: 'Quick Action Panel',
  pressCtrlKToOpen: 'Press Ctrl+K to open anytime',

  // 对话框按钮和消息
  deleteNoteConfirm: 'Are you sure you want to delete this note?',
  deleteNoteSuccess: 'Note deleted successfully',
  deleteNoteError: 'Failed to delete note',
  confirmDeleteNote: 'Are you sure you want to delete this note?',
  confirmDeleteNotePermanently: 'Are you sure you want to delete this note? This action cannot be undone.',
  deleteSuccess: 'Delete successful',
  noteCreateSuccess: 'Note created successfully',
  noteCreateError: 'Failed to create note',
  noteUpdateSuccess: 'Note updated successfully',
  noteUpdateError: 'Failed to update note',
  tagCreateSuccess: 'Tag created successfully',
  tagCreateError: 'Failed to create tag',
  settingsSaved: 'Settings saved successfully',
  settingsSaveError: 'Failed to save settings',
  languageApplied: 'Language settings applied',
  fontSizeApplied: 'Font size settings applied',
  themeApplied: 'Theme settings applied',
  settingsApplied: 'Your settings have been applied successfully',
  savingInProgress: 'Saving...',

  // 错误消息
  loadSettingsFailed: 'Failed to load settings',
  saveFailed: 'Save failed',
  settingsSaveFailed: 'Settings save failed, please try again',
  errorContentEmpty: 'Content is empty',
  errorFillNoteContent: 'Please fill in the note content',
  deleteFailed: 'Delete failed',
  errorRetry: 'Please try again',
  shortcutExists: 'This shortcut already exists',
  saveFailedRetry: 'Save failed, please try again',
  resetFailed: 'Reset failed',
  decryptFailed: 'Decryption Failed',
  incorrectKey: 'Incorrect key',
  exportFailed: 'Export failed',

  // 新增的翻译键
  shortcutExample: 'e.g: Ctrl+N',
  resetShortcuts: 'Reset Shortcuts',
  confirmResetShortcuts: 'Are you sure you want to reset all shortcuts to default settings?',
  clearData: 'Clear Data',
  confirmClearData: 'Are you sure you want to clear all note data? This action cannot be undone!',
  dangerousOperationsWarning: 'The following operations cannot be undone, please proceed with caution',
  featureInDevelopment: 'Feature in development',
  clearDataFeatureComingSoon: 'Clear data feature coming soon',
  startRecording: 'Click the plus button at the bottom to start recording your thoughts',
  reviewTimeArrived: 'Review Time Has Arrived',
  reviewReminderDescription: 'You have some notes that haven\'t been reviewed for over 7 days. Review them now for extra points!',
  selectExistingTag: 'Select from existing tags...',
  previewArea: '*Preview Area*',
  noteInputPlaceholder: 'Enter note content here (Markdown supported)...',
  smartNoteManagement: 'Smart Note Management',
  currentTheme: 'Current Theme',
  current: 'Current',
  languageSettings: 'Language Settings',
  chinese: 'Chinese',
  shortcutsSettings: 'Shortcuts Settings',

  // 按钮和操作
  editButton: 'Edit',
  reviewButton: 'Review',
  review: 'Review',
  addButton: 'Add',
  backToHome: 'Back',
  editNote: 'Edit',
  tagsInfo: 'Tags',
  contentArea: 'Content Area',
  deleteTag: 'Delete Tag',
  existingTagsSelect: 'Select Existing Tags',
  tagCreator: 'Tag Creator',
  allNotesFilter: 'All',
  gradeSuffix: 'Level',
  grade: 'Lv.',
  openSettings: 'Open Settings',
  toggleTheme: 'Toggle Theme',
  exportData: 'Export Data',
  createNewNoteDescription: 'Create a new note',
  searchExistingNotesDescription: 'Search existing notes',
  openAppSettingsDescription: 'Open app settings',
  toggleAppThemeDescription: 'Toggle app theme',
  exportNoteDataDescription: 'Export note data',

  // 文本和单位
  pointsUnit: 'points',
  encryptedContent: 'Private content encrypted',
  noteCountUnit: 'notes',
  noTagsYet: 'No tags yet',
  pointsReward: 'points',
  unlocked: 'Unlocked',

  // 主题名称
  lightTheme: 'Light Theme',
  darkTheme: 'Dark Theme',
  blueTheme: 'Blue Theme',
  greenTheme: 'Green Theme',
  purpleTheme: 'Purple Theme',
  orangeTheme: 'Orange Theme',

  // 活动记录
  activityNoteCreated: 'Create Note',
  activityNoteReviewed: 'Review Note',
  activityAchievementUnlocked: 'Unlock Achievement',
  activityNoteReused: 'Reuse Note',
  updatedAt: 'Updated at',

  // 字体设置
  smallFont: 'Small',
  mediumFont: 'Medium',
  largeFont: 'Large',
  smallFontPreview: 'Small font preview',
  mediumFontPreview: 'Medium font preview',
  largeFontPreview: 'Large font preview',
  fontSizePreview: 'Font preview',

  // 快捷键操作描述
  toggleShortcutsAction: 'Open Shortcuts Panel',
  newNoteAction: 'Create New Note',
  searchAction: 'Quick Search',
  saveAction: 'Save Note',
  settingsAction: 'Open Settings',
  toggleThemeAction: 'Toggle Theme',
  exportDataAction: 'Export Data',
  focusSearchAction: 'Focus Search Box',
  navigate: 'Navigate',

  // 其他缺失的翻译键
  deleteNote: 'Delete Note',
  confirmDeleteTag: 'Are you sure you want to delete this tag?',
  privateContentEncrypted: 'Private content encrypted',
  noNotesYet: 'No notes yet',
  noRelatedNotesFound: 'No related notes found',
  tryDifferentKeywords: 'Try using different keywords or tags',
  tagManagementTitle: 'Tag Management',
  createNewTagTitle: 'Create New Tag',
  noteCountWithUnit: 'Total {count} notes',
  achievementSystem: 'Achievement System',
  recentActivities: 'Recent Activities',
  noActivitiesYet: 'No activities yet',
  quickRecord: 'Quick Record',
  private: 'Private',
  public: 'Public',
  createNewTag: 'Create New Tag',
  themeSettings: 'Theme Settings',
  fontSettings: 'Font Settings',
  exportNoteData: 'Export Note Data',
  otherSettings: 'Other Settings',
  autoSaveDescription: 'Auto-save function helps prevent data loss',
  resetToDefault: 'Reset to Default',
  dangerousOperations: 'Dangerous Operations',
  clearAllData: 'Clear All Data',
  enableAIFeatures: 'Enable AI Features',
  enableAIDescription: 'Enable intelligent assistant, categorization and search features',
};

// 翻译集合
const translations = {
  zh,
  en,
} as const;

// 获取当前语言设置
function getCurrentLanguage(): 'zh' | 'en' {
  if (typeof window !== 'undefined') {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && (savedLanguage === 'zh' || savedLanguage === 'en')) {
      return savedLanguage;
    }
  }

  // 从浏览器语言设置中获取默认语言
  const browserLanguage = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'en';
  if (browserLanguage.startsWith('zh')) {
    return 'zh';
  }
  return 'en';
}

// 翻译函数
export function t(key: keyof Translations, params?: Record<string, string | number>): string {
  const lang = getCurrentLanguage();
  const translation = translations[lang][key];

  if (!translation) {
    console.warn(`Translation missing for key: ${key} in language: ${lang}`);
    return key;
  }

  // 支持参数插值
  if (params) {
    return Object.entries(params).reduce(
      (str, [param, value]) => str.replace(new RegExp(`{${param}}`, 'g'), String(value)),
      translation
    );
  }

  return translation;
}

// 切换语言
export function setLanguage(lang: 'zh' | 'en') {
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    // 触发语言变更事件，通知其他组件
    window.dispatchEvent(new CustomEvent('languagechange', { detail: lang }));
  }
}

// 获取当前语言（公开）
export { getCurrentLanguage as getCurrentLang };

