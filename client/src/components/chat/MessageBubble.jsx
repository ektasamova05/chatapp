import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Reply, Edit2, Trash2, Smile, CheckCheck, Download, Forward, PhoneMissed, Phone, Video, PhoneCall } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatTime, getFileUrl, formatFileSize, getFileIcon } from '../../utils/helpers';
import Avatar from '../ui/Avatar';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const MessageBubble = ({
  message, onReply, onEdit, onDelete, onReact, showAvatar,
  selectionMode, isSelected, onToggleSelect, onForward,
}) => {
  const { user } = useAuth();
  const isMine = message.senderId === user?.id;
  const [showMenu, setShowMenu] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const menuRef = useRef(null);
  const emojiRef = useRef(null);
  const isDeleted = message.deletedForEveryone;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBubbleClick = () => { if (selectionMode) onToggleSelect(message.id); };

  // ─────────────────────────────────────────
  // ✅ MISSED CALL bubble
  // ─────────────────────────────────────────
  if (message.type === 'missed_call') {
    const isVoice = message.callType === 'voice';
    const label = isMine
      ? `${isVoice ? 'Voice' : 'Video'} call — no answer`
      : `Missed ${isVoice ? 'voice' : 'video'} call`;

    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1
        ${selectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'bg-violet-600/10 rounded-xl px-1' : ''}`}
        onClick={handleBubbleClick}>
        {selectionMode && (
          <div className={`flex items-center flex-shrink-0 ${isMine ? 'ml-1' : 'mr-1'}`}>
            <Checkbox checked={isSelected} onChange={() => onToggleSelect(message.id)} />
          </div>
        )}
        <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border max-w-[260px]
          ${isMine ? 'bg-violet-600/10 border-violet-500/20 flex-row-reverse' : 'bg-red-500/10 border-red-500/20'}`}>
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
            ${isMine ? 'bg-violet-500/20' : 'bg-red-500/20'}`}>
            {isMine
              ? (isVoice ? <Phone size={15} className="text-violet-400" /> : <Video size={15} className="text-violet-400" />)
              : <PhoneMissed size={15} className="text-red-400" />}
          </div>
          <div className={isMine ? 'text-right' : 'text-left'}>
            <p className={`font-semibold text-xs leading-tight ${isMine ? 'text-violet-300' : 'text-red-400'}`}>
              {label}
            </p>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">{formatTime(message.createdAt)}</p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // ✅ ENDED CALL bubble (WhatsApp style with duration)
  // ─────────────────────────────────────────
  if (message.type === 'ended_call') {
    const isVoice = message.callType === 'voice';
    // content is like "Voice call · 02:34"
    const parts = (message.content || '').split(' · ');
    const callLabel = parts[0] || (isVoice ? 'Voice call' : 'Video call');
    const durationLabel = parts[1] || '';

    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1
        ${selectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'bg-violet-600/10 rounded-xl px-1' : ''}`}
        onClick={handleBubbleClick}>
        {selectionMode && (
          <div className={`flex items-center flex-shrink-0 ${isMine ? 'ml-1' : 'mr-1'}`}>
            <Checkbox checked={isSelected} onChange={() => onToggleSelect(message.id)} />
          </div>
        )}
        <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border max-w-[260px]
          ${isMine ? 'bg-violet-600/10 border-violet-500/20 flex-row-reverse' : 'bg-green-500/10 border-green-500/20'}`}>
          {/* Icon */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
            ${isMine ? 'bg-violet-500/20' : 'bg-green-500/20'}`}>
            {isVoice
              ? <PhoneCall size={15} className={isMine ? 'text-violet-400' : 'text-green-400'} />
              : <Video size={15} className={isMine ? 'text-violet-400' : 'text-green-400'} />}
          </div>
          {/* Text */}
          <div className={isMine ? 'text-right' : 'text-left'}>
            <p className={`font-semibold text-xs leading-tight
              ${isMine ? 'text-violet-300' : 'text-green-400'}`}>
              {callLabel}
              {durationLabel && (
                <span className="text-[var(--muted)] font-normal"> · {durationLabel}</span>
              )}
            </p>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">{formatTime(message.createdAt)}</p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // Deleted message
  // ─────────────────────────────────────────
  if (isDeleted) {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
        {selectionMode && (
          <div className="flex items-center mr-2">
            <Checkbox checked={isSelected} onChange={() => onToggleSelect(message.id)} />
          </div>
        )}
        <div className="msg-deleted px-4 py-2 text-sm flex items-center gap-2">
          🚫 This message was deleted
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (message.type === 'image') {
      return (
        <a href={getFileUrl(message.fileUrl)} target="_blank" rel="noreferrer">
          <img src={getFileUrl(message.fileUrl)} alt="img"
            className="max-w-[240px] rounded-xl cursor-pointer hover:opacity-90 transition-opacity" />
        </a>
      );
    }
    if (message.type === 'voice') {
      return (
        <audio controls className="max-w-[220px]" style={{ height: 36 }}>
          <source src={getFileUrl(message.fileUrl)} />
        </audio>
      );
    }
    if (message.type === 'video') {
      return (
        <video controls className="max-w-[240px] rounded-xl">
          <source src={getFileUrl(message.fileUrl)} />
        </video>
      );
    }
    if (message.type === 'file') {
      return (
        <a href={getFileUrl(message.fileUrl)} download={message.fileName} target="_blank" rel="noreferrer"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl">{getFileIcon(message.fileName, message.type)}</span>
          <div>
            <p className="text-sm font-medium">{message.fileName}</p>
            <p className="text-xs opacity-60">{formatFileSize(message.fileSize)}</p>
          </div>
          <Download size={14} className="ml-1 opacity-60" />
        </a>
      );
    }
    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {message.content}
        {message.isEdited && <span className="text-[10px] opacity-50 ml-1">(edited)</span>}
      </p>
    );
  };

  const reactionEntries = Object.entries(message.reactions || {}).filter(([, users]) => users.length > 0);

  return (
    <div className={`flex gap-2 mb-1 group ${isMine ? 'flex-row-reverse' : 'flex-row'}
      ${selectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'bg-violet-600/10 rounded-xl px-1' : ''}`}
      onClick={handleBubbleClick}>

      {selectionMode && (
        <div className={`flex items-center flex-shrink-0 ${isMine ? 'ml-1' : 'mr-1'}`}>
          <Checkbox checked={isSelected} onChange={() => onToggleSelect(message.id)} />
        </div>
      )}

      {!isMine && (
        <div className="w-8 flex-shrink-0 self-end mb-1">
          {showAvatar && <Avatar user={message.sender} size="xs" />}
        </div>
      )}

      <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[72%]`}>
        {!isMine && showAvatar && (
          <span className="text-xs text-[var(--muted)] mb-1 ml-1">{message.sender?.username}</span>
        )}

        {message.replyTo && !message.replyTo.deletedForEveryone && (
          <div className={`px-3 py-1.5 rounded-xl mb-1 border-l-2 border-violet-500 bg-black/20 text-xs max-w-full
            ${isMine ? 'text-right' : 'text-left'}`}>
            <span className="text-violet-400 font-semibold">{message.replyTo.sender?.username}</span>
            <p className="text-[var(--muted)] truncate">{message.replyTo.content || '📎 File'}</p>
          </div>
        )}

        <div className="relative">
          <div className={`px-4 py-2.5 ${isMine ? 'msg-sent text-white' : 'msg-received text-[var(--text)]'}
            ${message.type !== 'text' ? 'p-2' : ''}`}>
            {renderContent()}
          </div>

          {!selectionMode && (
            <div className={`absolute top-1/2 -translate-y-1/2 ${isMine ? '-left-24' : '-right-24'}
              hidden group-hover:flex items-center gap-1 z-10`}>
              <button onClick={(e) => { e.stopPropagation(); setShowEmoji(p => !p); }}
                className="p-1.5 hover:bg-[var(--hover)] rounded-lg text-[var(--muted)] hover:text-yellow-400 transition-colors">
                <Smile size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onReply(message); }}
                className="p-1.5 hover:bg-[var(--hover)] rounded-lg text-[var(--muted)] hover:text-violet-400 transition-colors">
                <Reply size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onForward(message); }}
                className="p-1.5 hover:bg-[var(--hover)] rounded-lg text-[var(--muted)] hover:text-green-400 transition-colors">
                <Forward size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setShowMenu(p => !p); }}
                className="p-1.5 hover:bg-[var(--hover)] rounded-lg text-[var(--muted)] transition-colors">
                <MoreVertical size={14} />
              </button>
            </div>
          )}

          {showEmoji && (
            <div ref={emojiRef} className={`absolute top-0 ${isMine ? 'right-full mr-2' : 'left-full ml-2'}
              context-menu flex gap-1 p-2 z-20`}>
              {EMOJIS.map(e => (
                <button key={e} onClick={(ev) => { ev.stopPropagation(); onReact(message.id, e); setShowEmoji(false); }}
                  className="text-lg hover:scale-125 transition-transform">{e}</button>
              ))}
            </div>
          )}

          {showMenu && (
            <div ref={menuRef} className={`absolute top-0 ${isMine ? 'right-full mr-2' : 'left-full ml-2'}
              context-menu min-w-[160px] z-20 py-1`}>
              <button onClick={(e) => { e.stopPropagation(); onReply(message); setShowMenu(false); }}
                className="w-full px-4 py-2.5 text-sm text-left hover:bg-[var(--hover)] flex items-center gap-2">
                <Reply size={14} /> Reply
              </button>
              <button onClick={(e) => { e.stopPropagation(); onForward(message); setShowMenu(false); }}
                className="w-full px-4 py-2.5 text-sm text-left hover:bg-[var(--hover)] flex items-center gap-2 text-green-400">
                <Forward size={14} /> Forward
              </button>
              {isMine && message.type === 'text' && (
                <button onClick={(e) => { e.stopPropagation(); onEdit(message); setShowMenu(false); }}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-[var(--hover)] flex items-center gap-2">
                  <Edit2 size={14} /> Edit
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); onDelete(message.id, 'me'); setShowMenu(false); }}
                className="w-full px-4 py-2.5 text-sm text-left hover:bg-[var(--hover)] text-red-400 flex items-center gap-2">
                <Trash2 size={14} /> Delete for me
              </button>
              {isMine && (
                <button onClick={(e) => { e.stopPropagation(); onDelete(message.id, 'everyone'); setShowMenu(false); }}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-[var(--hover)] text-red-400 flex items-center gap-2">
                  <Trash2 size={14} /> Delete for everyone
                </button>
              )}
            </div>
          )}
        </div>

        {reactionEntries.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {reactionEntries.map(([emoji, users]) => (
              <button key={emoji} onClick={(e) => { e.stopPropagation(); onReact(message.id, emoji); }}
                className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs transition-colors
                  ${users.includes(user?.id) ? 'bg-violet-600/30 border border-violet-500/40' : 'bg-[var(--hover)] border border-[var(--border)]'}`}>
                {emoji} <span className="text-[10px] text-[var(--muted)]">{users.length}</span>
              </button>
            ))}
          </div>
        )}

        <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-[var(--muted)]">{formatTime(message.createdAt)}</span>
          {isMine && (
            <CheckCheck size={12} className={message.readBy?.length > 0 ? 'text-violet-400' : 'text-[var(--muted)]'} />
          )}
        </div>
      </div>
    </div>
  );
};

const Checkbox = ({ checked, onChange }) => (
  <button onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
      ${checked ? 'bg-violet-600 border-violet-600' : 'border-[var(--muted)] bg-transparent hover:border-violet-400'}`}>
    {checked && (
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </button>
);

export default MessageBubble;


