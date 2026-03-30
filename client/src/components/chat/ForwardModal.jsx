import React, { useState, useMemo } from 'react';
import { X, Search, Send, Forward } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import Avatar from '../ui/Avatar';

/**
 * ForwardModal
 * Props:
 *   message  – the message object to forward (single forward)
 *   messages – array of message objects (multi-select forward)
 *   onClose  – close handler
 *   onSend   – async (receiverId, content, type, file, replyToId) — same signature as sendMessage
 */
const ForwardModal = ({ message, messages, onClose, onSend }) => {
  const { conversations, friends } = useChat();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  // Build a unified list: existing conversations + friends not yet in convs
  const targets = useMemo(() => {
    const list = [];
    const seen = new Set();

    // Existing conversations
    conversations.forEach(c => {
      if (c.otherUser) {
        seen.add(c.otherUser.id);
        list.push({ id: c.otherUser.id, user: c.otherUser, label: c.otherUser.username, convId: c.id });
      }
    });

    // Friends without a conversation yet
    friends.forEach(f => {
      if (!seen.has(f.id)) {
        list.push({ id: f.id, user: f, label: f.username, convId: null });
      }
    });

    return list;
  }, [conversations, friends]);

  const filtered = useMemo(() =>
    query.trim()
      ? targets.filter(t => t.label.toLowerCase().includes(query.toLowerCase()))
      : targets,
    [targets, query]
  );

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Determine what to forward
  const msgsToForward = messages && messages.length > 0 ? messages : message ? [message] : [];

  const handleSend = async () => {
    if (selected.size === 0 || msgsToForward.length === 0) return;
    setSending(true);
    try {
      for (const receiverId of selected) {
        for (const msg of msgsToForward) {
          // Forward text content or file
          if (msg.type === 'text') {
            await onSend(receiverId, `↪ ${msg.content}`, 'text', null, null);
          } else if (msg.fileUrl) {
            // For media/file messages, forward the content caption or type label
            const caption = msg.content
              ? `↪ ${msg.content}`
              : `↪ Forwarded ${msg.type}`;
            //await onSend(receiverId, caption, 'text', null, null);
            
             await onSend(
              receiverId,
              caption,
              msg.type,                 // ✅ keep original type (image/video)
              null,  // 🔥 THIS IS THE MAIN FIX
              null
            );


          }
        }
      }
      setDone(true);
      setTimeout(onClose, 800);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ background: 'var(--sidebar)', border: '1px solid var(--border)', maxHeight: '80vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Forward size={18} className="text-green-400" />
            <h2 className="font-bold text-[var(--text)]">Forward Message</h2>
            {msgsToForward.length > 1 && (
              <span className="text-xs px-2 py-0.5 bg-violet-600/20 text-violet-400 rounded-full">
                {msgsToForward.length} msgs
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--hover)] rounded-lg text-[var(--muted)] hover:text-[var(--text)] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Message preview */}
        {msgsToForward.length === 1 && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-[var(--hover)] border-l-2 border-green-500">
            <p className="text-xs text-green-400 font-semibold mb-0.5">Forwarding</p>
            <p className="text-xs text-[var(--muted)] truncate">
              {msgsToForward[0].content || `📎 ${msgsToForward[0].type}`}
            </p>
          </div>
        )}

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search conversations or friends..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="input-base pl-8 py-2 text-sm w-full"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 ? (
            <p className="text-center text-[var(--muted)] text-sm py-8">No contacts found</p>
          ) : filtered.map(t => {
            const isChecked = selected.has(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-0.5
                  ${isChecked ? 'bg-violet-600/15 border border-violet-500/30' : 'hover:bg-[var(--hover)]'}`}>
                <div className="relative">
                  <Avatar user={t.user} size="sm" showOnline />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-[var(--text)]">{t.label}</p>
                  <p className="text-xs text-[var(--muted)]">{t.user?.isOnline ? 'Online' : 'Offline'}</p>
                </div>
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                  ${isChecked ? 'bg-violet-600 border-violet-600' : 'border-[var(--muted)]'}`}>
                  {isChecked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-between gap-3">
          <span className="text-xs text-[var(--muted)]">
            {selected.size > 0 ? `${selected.size} selected` : 'Select recipients'}
          </span>
          <button
            onClick={handleSend}
            disabled={selected.size === 0 || sending || done}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700
              disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold
              rounded-xl transition-all active:scale-95">
            {done ? (
              <><span>✓</span> Sent!</>
            ) : sending ? (
              <><span className="animate-spin">↻</span> Sending...</>
            ) : (
              <><Send size={14} /> Forward</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;