import React, { useEffect, useRef, useState } from 'react';
import {
  Phone, Video, MoreVertical, ArrowLeft, Info,
  CheckSquare, Trash2, X, CheckCheck, Forward,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import CallScreen from '../calls/CallScreen';
import ProfileModal from '../profile/ProfileModal';
import ForwardModal from './ForwardModal';
import Avatar from '../ui/Avatar';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatLastSeen } from '../../utils/helpers';

const ChatWindow = ({ conv, onBack }) => {
  const { user, socket } = useAuth();
  const { messages, loadMessages, sendMessage, setMessages, typingUsers, clearUnread } = useChat();
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [editText, setEditText] = useState('');
  const [callData, setCallData] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const bottomRef = useRef();
  const editRef = useRef();

  // ── Multi-select state ──
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // ── Forward state ──
  const [forwardMsg, setForwardMsg] = useState(null);      // single message forward
  const [showForwardModal, setShowForwardModal] = useState(false);

  const otherUser = conv?.otherUser;
  const convId = conv?.id;
  const convMessages = messages[convId] || [];
  const isTyping = typingUsers[convId];

  // Reset selection when conversation changes
  useEffect(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setForwardMsg(null);
    setShowForwardModal(false);
  }, [convId]);

  useEffect(() => {
    if (convId) {
      loadMessages(convId);
      clearUnread(convId);
      socket?.emit('conversation:join', `conv:${convId}`);
      socket?.emit('message:read', { conversationId: convId, receiverId: otherUser?.id });
    }
    return () => { if (convId) socket?.emit('conversation:leave', `conv:${convId}`); };
  }, [convId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convMessages.length, isTyping]);

  useEffect(() => {
    socket?.on('call:incoming', ({ callerId, callerName, callerAvatar, callType, offer }) => {
      setCallData({
        peer: { id: callerId, username: callerName, avatar: callerAvatar },
        callType, incoming: true, offer,
      });
    });
    return () => socket?.off('call:incoming');
  }, [socket]);

  // ── Selection helpers ──
  const toggleSelect = (msgId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(msgId) ? next.delete(msgId) : next.add(msgId);
      return next;
    });
  };

  const selectAll = () => {
    const allIds = convMessages
      .filter(m => !m.deletedForEveryone)
      .map(m => m.id);
    setSelectedIds(new Set(allIds));
  };

  const deselectAll = () => setSelectedIds(new Set());

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  // ── Multi-delete ──
  const handleMultiDelete = async (deleteFor) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      // Fire all deletes in parallel
      await Promise.all(
        ids.map(id => api.delete(`/messages/${id}`, { data: { deleteFor } }))
      );

      if (deleteFor === 'everyone') {
        setMessages(prev => ({
          ...prev,
          [convId]: (prev[convId] || []).map(m =>
            ids.includes(m.id) ? { ...m, deletedForEveryone: true, content: null } : m
          ),
        }));
        ids.forEach(id => {
          socket?.emit('message:deleted', {
            messageId: id,
            conversationId: convId,
            receiverId: otherUser?.id,
            deleteFor: 'everyone',
          });
        });
      } else {
        setMessages(prev => ({
          ...prev,
          [convId]: (prev[convId] || []).filter(m => !ids.includes(m.id)),
        }));
      }

      toast.success(`${ids.length} message${ids.length > 1 ? 's' : ''} deleted`);
      exitSelectionMode();
    } catch {
      toast.error('Delete failed');
    }
  };

  // ── Forward ──
  const handleForwardSingle = (msg) => {
    setForwardMsg(msg);
    setShowForwardModal(true);
  };

  const handleForwardSelected = () => {
    if (selectedIds.size === 0) return;
    setForwardMsg(null);   // signals "use selectedIds"
    setShowForwardModal(true);
  };

  const selectedMessages = convMessages.filter(m => selectedIds.has(m.id));

  // ── Single message handlers ──
  const handleSend = async (content, file) => {
    if (!otherUser) return;
    await sendMessage(otherUser.id, content, 'text', file, replyTo?.id);
    setReplyTo(null);
  };

  const handleReact = async (messageId, emoji) => {
    try {
      const res = await api.post(`/messages/${messageId}/react`, { emoji });
      setMessages(prev => ({
        ...prev,
        [convId]: prev[convId].map(m => m.id === messageId ? { ...m, reactions: res.data.reactions } : m),
      }));
      socket?.emit('message:reaction', {
        messageId, conversationId: convId, reactions: res.data.reactions, receiverId: otherUser?.id,
      });
    } catch {}
  };

  const handleDelete = async (messageId, deleteFor) => {
    try {
      await api.delete(`/messages/${messageId}`, { data: { deleteFor } });
      if (deleteFor === 'everyone') {
        setMessages(prev => ({
          ...prev,
          [convId]: prev[convId].map(m =>
            m.id === messageId ? { ...m, deletedForEveryone: true, content: null } : m
          ),
        }));
        socket?.emit('message:deleted', { messageId, conversationId: convId, receiverId: otherUser?.id, deleteFor });
      } else {
        setMessages(prev => ({
          ...prev,
          [convId]: prev[convId].filter(m => m.id !== messageId),
        }));
      }
    } catch { toast.error('Delete failed'); }
  };

  const handleEdit = (msg) => {
    setEditingMsg(msg);
    setEditText(msg.content);
    setTimeout(() => editRef.current?.focus(), 50);
  };

  const saveEdit = async () => {
    if (!editText.trim() || editText === editingMsg.content) { setEditingMsg(null); return; }
    try {
      const res = await api.put(`/messages/${editingMsg.id}`, { content: editText });
      setMessages(prev => ({
        ...prev,
        [convId]: prev[convId].map(m => m.id === editingMsg.id ? res.data.message : m),
      }));
      socket?.emit('message:edited', { message: res.data.message, conversationId: convId, receiverId: otherUser?.id });
      setEditingMsg(null);
    } catch { toast.error('Edit failed'); }
  };

  const startCall = (type) => {
    setCallData({ peer: otherUser, callType: type, incoming: false });
  };

  if (!conv) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center animate-fade-in">
          <div className="w-24 h-24 bg-violet-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-violet-500/20">
            <span className="text-5xl">💬</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--text)] mb-2">Select a conversation</h2>
          <p className="text-[var(--muted)] text-sm">Choose from your existing chats or start a new one</p>
        </div>
      </div>
    );
  }

  // Group messages by date
  const grouped = convMessages.reduce((acc, msg) => {
    const date = new Date(msg.createdAt).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  const allNonDeletedIds = convMessages.filter(m => !m.deletedForEveryone).map(m => m.id);
  const allSelected = allNonDeletedIds.length > 0 && allNonDeletedIds.every(id => selectedIds.has(id));

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Normal Header ── */}
      {!selectionMode && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]"
          style={{ background: 'var(--sidebar)' }}>
          <button onClick={onBack} className="md:hidden p-2 hover:bg-[var(--hover)] rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </button>
          <button onClick={() => setShowProfile(true)} className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar user={otherUser} size="md" showOnline />
            <div className="text-left min-w-0">
              <p className="font-semibold text-sm text-[var(--text)] truncate">{otherUser?.username}</p>
              <p className="text-xs text-[var(--muted)]">
                {isTyping ? (
                  <span className="text-violet-400 flex items-center gap-1.5">
                    <span className="flex gap-0.5">
                      {[0, 1, 2].map(i => <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
                    </span>
                    typing...
                  </span>
                ) : otherUser?.isOnline ? (
                  <span className="text-green-400">Online</span>
                ) : (
                  formatLastSeen(otherUser?.lastSeen)
                )}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => startCall('voice')}
              className="p-2.5 hover:bg-[var(--hover)] rounded-xl text-[var(--muted)] hover:text-violet-400 transition-colors">
              <Phone size={18} />
            </button>
            <button onClick={() => startCall('video')}
              className="p-2.5 hover:bg-[var(--hover)] rounded-xl text-[var(--muted)] hover:text-violet-400 transition-colors">
              <Video size={18} />
            </button>
            <button onClick={() => setShowProfile(true)}
              className="p-2.5 hover:bg-[var(--hover)] rounded-xl text-[var(--muted)] hover:text-[var(--text)] transition-colors">
              <Info size={18} />
            </button>
            {/* Enter selection mode */}
            <button
              onClick={() => setSelectionMode(true)}
              className="p-2.5 hover:bg-[var(--hover)] rounded-xl text-[var(--muted)] hover:text-violet-400 transition-colors"
              title="Select messages">
              <CheckSquare size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ── Selection Mode Header ── */}
      {selectionMode && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]"
          style={{ background: 'var(--sidebar)' }}>
          {/* Close */}
          <button onClick={exitSelectionMode}
            className="p-2 hover:bg-[var(--hover)] rounded-lg text-[var(--muted)] hover:text-[var(--text)] transition-colors">
            <X size={18} />
          </button>

          {/* Count */}
          <span className="flex-1 text-sm font-semibold text-[var(--text)]">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select messages'}
          </span>

          {/* Select All toggle */}
          <button
            onClick={allSelected ? deselectAll : selectAll}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors
              ${allSelected
                ? 'bg-violet-600/20 text-violet-400'
                : 'hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)]'}`}>
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>

          {/* Forward selected */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleForwardSelected}
              className="p-2.5 hover:bg-[var(--hover)] rounded-xl text-green-400 hover:text-green-300 transition-colors"
              title="Forward selected">
              <Forward size={18} />
            </button>
          )}

          {/* Delete selected */}
          {selectedIds.size > 0 && (
            <div className="relative group/del">
              <button
                className="p-2.5 hover:bg-red-500/10 rounded-xl text-red-400 hover:text-red-300 transition-colors"
                title="Delete selected">
                <Trash2 size={18} />
              </button>
              {/* Delete sub-menu on hover */}
              <div className="absolute right-0 top-full mt-1 context-menu min-w-[170px] py-1 z-30
                hidden group-hover/del:block">
                <button
                  onClick={() => handleMultiDelete('me')}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-[var(--hover)] text-red-400 flex items-center gap-2">
                  <Trash2 size={14} /> Delete for me
                </button>
                <button
                  onClick={() => handleMultiDelete('everyone')}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-[var(--hover)] text-red-400 flex items-center gap-2">
                  <Trash2 size={14} /> Delete for everyone
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5"
        style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(124,58,237,0.03) 0%, transparent 50%)' }}>
        {Object.entries(grouped).map(([date, msgs]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-xs text-[var(--muted)] px-3 py-1 bg-[var(--surface)] rounded-full border border-[var(--border)]">
                {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            {msgs.map((msg, i) => {
              const prevMsg = msgs[i - 1];
              const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId;
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  showAvatar={showAvatar}
                  onReply={setReplyTo}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onReact={handleReact}
                  onForward={handleForwardSingle}
                  // selection props
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(msg.id)}
                  onToggleSelect={toggleSelect}
                />
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 py-1">
            <Avatar user={otherUser} size="xs" />
            <div className="msg-received px-4 py-3 flex gap-1 items-center">
              {[0, 1, 2].map(i => <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Edit bar */}
      {editingMsg && (
        <div className="px-4 py-2 border-t border-violet-500/30 bg-violet-900/10 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-violet-400 mb-1">Editing message</p>
            <input ref={editRef} value={editText} onChange={e => setEditText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingMsg(null); }}
              className="input-base text-sm py-2" />
          </div>
          <button onClick={saveEdit} className="btn-primary text-sm py-2">Save</button>
          <button onClick={() => setEditingMsg(null)} className="btn-ghost text-sm py-2">Cancel</button>
        </div>
      )}

      {/* Input — hidden in selection mode */}
      {!selectionMode && (
        <MessageInput
          onSend={handleSend}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          receiverId={otherUser?.id}
          conversationId={convId}
        />
      )}

      {/* Selection mode bottom bar */}
      {selectionMode && (
        <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-center gap-2"
          style={{ background: 'var(--sidebar)' }}>
          <p className="text-xs text-[var(--muted)]">
            Tap messages to select • Use toolbar above to delete or forward
          </p>
        </div>
      )}

      {/* Call Screen */}
      {callData && (
        <CallScreen
          callData={callData}
          socket={socket}
          currentUser={user}
          onEnd={() => setCallData(null)}
        />
      )}

      {/* Profile Modal */}
      {showProfile && (
        <ProfileModal user={otherUser} isOwn={false} onClose={() => setShowProfile(false)} />
      )}

      {/* Forward Modal */}
      {showForwardModal && (
        // <ForwardModal
        //   message={forwardMsg}
        //   messages={forwardMsg ? null : selectedMessages}
        //   onClose={() => { setShowForwardModal(false); setForwardMsg(null); }}
        //   onSend={sendMessage}
        // />
        <ForwardModal
          message={forwardMsg}
          messages={forwardMsg ? null : selectedMessages}
          onClose={() => { setShowForwardModal(false); setForwardMsg(null); }}
          onSend={async (receiverId) => {
            try {
              // ✅ MULTIPLE FORWARD
              if (!forwardMsg && selectedMessages.length > 0) {
                await Promise.all(
                  selectedMessages.map(m =>
                    api.post('/messages/forward', {
                      messageId: m.id,
                      receiverId
                    })
                  )
                );
              } 
              // ✅ SINGLE FORWARD
              else if (forwardMsg) {
                await api.post('/messages/forward', {
                  messageId: forwardMsg.id,
                  receiverId
                });
              }

              // ✅ refresh chat
              await loadMessages(convId);

            } catch (err) {
              console.error(err.response?.data || err.message);
              toast.error(err.response?.data?.message || 'Forward failed');
            }
          }}
        />
      )}
    </div>
  );
};

export default ChatWindow;



