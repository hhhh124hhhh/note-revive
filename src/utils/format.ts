import { Note, ExportFormat } from '../types';

export const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('zh-CN');
};

export const formatDateTime = (date: Date): string => {
  return new Date(date).toLocaleString('zh-CN');
};

export const getPreviewText = (note: Note, maxLength: number = 50): string => {
  if (note.isPrivate) {
    return '私密内容已加密';
  }

  const content = note.content.substring(0, maxLength);
  return note.content.length > maxLength ? content + '...' : content;
};

export const exportNotes = (notes: Note[], format: ExportFormat): string => {
  switch (format) {
    case 'json':
      return JSON.stringify(notes, null, 2);

    case 'markdown':
      return notes.map(note => {
        // 生成更有意义的标题，使用内容的前30个字符并去除特殊字符
        const title = getPreviewText(note, 30).replace(/[^\w\s\u4e00-\u9fff]/g, '').trim() || '未命名便签';
        const tags = note.tags.map(tag => `#${tag}`).join(' ');
        const date = formatDateTime(note.updatedAt);
        const status = note.status === 'saved' ? '已保存' :
                      note.status === 'reviewed' ? '已回顾' :
                      note.status === 'reused' ? '已复用' : '草稿';
        const privacy = note.isPrivate ? '🔒 私密' : '🔓 公开';

        return `# ${title}

**状态：** ${status} | **隐私：** ${privacy} | **更新时间：** ${date}

${tags ? `**标签：** ${tags}\n\n` : ''}${note.content}

---

`;
      }).join('');

    case 'txt':
      return notes.map(note => {
        const title = getPreviewText(note, 30);
        const tags = note.tags.join(', ');
        const date = formatDateTime(note.updatedAt);
        const status = note.status === 'saved' ? '已保存' :
                      note.status === 'reviewed' ? '已回顾' :
                      note.status === 'reused' ? '已复用' : '草稿';
        const privacy = note.isPrivate ? '私密' : '公开';

        return `标题：${title}
标签：${tags}
时间：${date}
状态：${status}
隐私：${privacy}

${note.content}

${'='.repeat(50)}

`;
      }).join('');

    default:
      return '';
  }
};

export const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const FORMAT_EXTENSIONS = {
  'json': 'json',
  'markdown': 'md',  // 使用标准的 .md 后缀
  'txt': 'txt'
} as const;

export const generateExportFilename = (format: ExportFormat): string => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  const extension = FORMAT_EXTENSIONS[format];

  return `notes-export-${dateStr}-${timeStr}.${extension}`;
};