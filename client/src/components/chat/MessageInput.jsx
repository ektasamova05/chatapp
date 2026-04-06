import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Smile, Mic, MicOff, X, Reply } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../../context/AuthContext';

const MessageInput = ({ onSend, replyTo, onCancelReply, receiverId, conversationId }) => {
  const { socket, user } = useAuth();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const textRef = useRef(null);
  const fileRef = useRef(null);
  const typingTimer = useRef(null);

  // Auto-resize textarea — done via useEffect on text change, not onInput
  // Using onInput was causing focus issues because it modifies the DOM directly
  // while React is also managing the element
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [text]);

  // Reset textarea height when conversation changes
  useEffect(() => {
    setText('');
    setFile(null);
    setFilePreview(null);
    setShowEmoji(false);
    if (textRef.current) textRef.current.style.height = 'auto';
  }, [conversationId]);

  const emitTyping = useCallback(() => {
    if (!socket || !conversationId || !receiverId  || !user ) return;
    socket.emit('typing:start', {
       conversationId,
       userId: user.id,
      username: user.username,
    });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId,});
    }, 1500);
  }, [socket, conversationId, receiverId, user]);

  const handleChange = (e) => {
    setText(e.target.value);
    emitTyping();
  };

  const handleSend = useCallback(async () => {
    if (!text.trim() && !file) return;
    const content = text.trim();
    const fileToSend = file;
    // Clear state immediately for snappy UX
    setText('');
    setFile(null);
    setFilePreview(null);
    setShowEmoji(false);
    if (textRef.current) textRef.current.style.height = 'auto';
    clearTimeout(typingTimer.current);
    socket?.emit('typing:stop', { conversationId, receiverId });
    await onSend(content, fileToSend);
  }, [text, file, onSend, socket, conversationId, receiverId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = useCallback((emojiData) => {
    const emoji = emojiData.emoji;
    const el = textRef.current;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newText = text.substring(0, start) + emoji + text.substring(end);
      setText(newText);
      // Restore cursor after emoji — done in next tick after React re-render
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setText(p => p + emoji);
    }
  }, [text]);

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result);
      reader.readAsDataURL(f);
    } else {
      setFilePreview(null);
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const audioFile = new File([blob], 'voice.webm', { type: 'audio/webm' });
        setFile(audioFile);
        setFilePreview('voice');
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      alert('Microphone access denied');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="p-3 border-t border-[var(--border)]" style={{ background: 'var(--sidebar)' }}>

      {/* Reply Preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-[var(--hover)] rounded-xl border-l-2 border-violet-500">
          <Reply size={14} className="text-violet-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-violet-400 font-semibold">{replyTo.sender?.username}</p>
            <p className="text-xs text-[var(--muted)] truncate">{replyTo.content || '📎 File'}</p>
          </div>
          <button onClick={onCancelReply} className="text-[var(--muted)] hover:text-[var(--text)]">
            <X size={14} />
          </button>
        </div>
      )}

      {/* File Preview */}
      {file && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-[var(--hover)] rounded-xl">
          {filePreview && filePreview !== 'voice' ? (
            <img src={filePreview} alt="preview" className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
          ) : filePreview === 'voice' ? (
            <span className="text-2xl">🎵</span>
          ) : (
            <span className="text-2xl">📎</span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{file.name}</p>
            <p className="text-xs text-[var(--muted)]">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button onClick={() => { setFile(null); setFilePreview(null); }}
            className="text-[var(--muted)] hover:text-red-400 transition-colors flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-2">

        {/* Emoji Picker */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowEmoji(p => !p)}
            className={`p-2.5 rounded-xl transition-colors
              ${showEmoji
                ? 'bg-violet-600/20 text-violet-400'
                : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'}`}>
            <Smile size={20} />
          </button>
          {showEmoji && (
            <div className="absolute bottom-full mb-2 left-0 z-30">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme="dark"
                skinTonesDisabled
                height={350}
                width={300}
              />
            </div>
          )}
        </div>

        {/* File Attach */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="p-2.5 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] rounded-xl transition-colors flex-shrink-0">
          <Paperclip size={20} />
        </button>
        <input
          ref={fileRef}
          type="file"
          hidden
          onChange={handleFileSelect}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip,.txt"
        />

        {/* Textarea */}
        <textarea
          ref={textRef}
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="input-base resize-none py-3 text-sm leading-5 flex-1"
          style={{ overflow: 'hidden', minHeight: '46px', maxHeight: '120px' }}
        />

        {/* Voice Record — hold to record */}
        <button
          type="button"
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={recording ? stopRecording : undefined}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          className={`p-2.5 rounded-xl transition-colors flex-shrink-0
            ${recording
              ? 'bg-red-600 text-white animate-pulse'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'}`}>
          {recording ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Send */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() && !file}
          className="p-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed
            text-white rounded-xl transition-all active:scale-95 flex-shrink-0">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
