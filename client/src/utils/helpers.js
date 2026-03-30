import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

export const formatTime = (date) => {
  if (!date) return '';
  return format(new Date(date), 'HH:mm');
};

export const formatLastSeen = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return `Today at ${format(d, 'HH:mm')}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, 'HH:mm')}`;
  return format(d, 'dd MMM yyyy, HH:mm');
};

export const formatConversationDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd/MM/yyyy');
};

export const getAvatarUrl = (avatar) => {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  return `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${avatar}`;
};

// export const getFileUrl = (url) => {
//   if (!url) return null;
//   if (url.startsWith('http')) return url;
//   return `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${url}`;
// };

export const getFileUrl = (url) => {
  if (!url) return '';

  // already full URL
  if (url.startsWith('http')) return url;

  // ensure proper slash
  return `http://localhost:5000${url.startsWith('/') ? '' : '/'}${url}`;
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const getFileIcon = (fileName, type) => {
  if (type === 'image') return '🖼️';
  if (type === 'voice' || type === 'audio') return '🎵';
  if (type === 'video') return '🎬';
  const ext = fileName?.split('.').pop()?.toLowerCase();
  const icons = { pdf: '📄', doc: '📝', docx: '📝', zip: '🗜️', txt: '📋', xls: '📊', xlsx: '📊' };
  return icons[ext] || '📎';
};

export const truncate = (str, n = 40) =>
  str?.length > n ? str.substring(0, n) + '...' : str;

export const generateInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
};
