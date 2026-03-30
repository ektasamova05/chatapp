// import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
// import { useAuth } from './AuthContext';
// import api from '../utils/api';
// import toast from 'react-hot-toast';

// const ChatContext = createContext(null);

// export const ChatProvider = ({ children }) => {
//   const { user, socket } = useAuth();
//   const [conversations, setConversations] = useState([]);
//   const [activeConv, setActiveConv] = useState(null);
//   const activeConvRef = useRef(null);
//   const [messages, setMessages] = useState({});
//   const [pendingRequests, setPendingRequests] = useState([]);
//   const [friends, setFriends] = useState([]);
//   const [typingUsers, setTypingUsers] = useState({});
//   const [onlineUsers, setOnlineUsers] = useState(new Set());
//   const [loading, setLoading] = useState(false);

//   const setActiveConvSafe = useCallback((conv) => {
//     activeConvRef.current = conv;
//     setActiveConv(conv);
//   }, []);

//   const loadConversations = useCallback(async () => {
//     try {
//       const res = await api.get('/conversations');
//       setConversations(res.data.conversations);
//     } catch {}
//   }, []);

//   const loadMessages = useCallback(async (convId) => {
//     setLoading(true);
//     try {
//       const res = await api.get(`/conversations/${convId}/messages`);
//       setMessages(prev => ({ ...prev, [convId]: res.data.messages }));
//     } catch {}
//     setLoading(false);
//   }, []);

//   const loadPendingRequests = useCallback(async () => {
//     try {
//       const res = await api.get('/friends/pending');
//       setPendingRequests(res.data.requests);
//     } catch {}
//   }, []);

//   const loadFriends = useCallback(async () => {
//     try {
//       const res = await api.get('/friends');
//       const friendsList = res.data.friends;
//       setFriends(friendsList);
//       const initialOnline = new Set(friendsList.filter(f => f.isOnline).map(f => f.id));
//       setOnlineUsers(initialOnline);
//     } catch {}
//   }, []);

//   useEffect(() => {
//     if (user) {
//       loadConversations();
//       loadPendingRequests();
//       loadFriends();
//     }
//   }, [user]);

//   // ================= SOCKET EVENTS =================
//   useEffect(() => {
//     if (!socket) return;

//     // ── Online / Offline ──
//     socket.on('user:online', ({ userId }) => {
//       if (userId === user?.id) return;
//       setOnlineUsers(prev => { const s = new Set(prev); s.add(userId); return s; });
//       setFriends(prev => prev.map(f => f.id === userId ? { ...f, isOnline: true } : f));
//     });

//     socket.on('user:offline', ({ userId }) => {
//       if (userId === user?.id) return;
//       setOnlineUsers(prev => { const s = new Set(prev); s.delete(userId); return s; });
//       setFriends(prev => prev.map(f => f.id === userId ? { ...f, isOnline: false } : f));
//     });

//     // ── New message ──
//     socket.on('message:new', ({ message, conversationId }) => {
//       setMessages(prev => {
//         const existing = prev[conversationId] || [];
//         if (existing.some(m => m.id === message.id)) return prev;
//         return { ...prev, [conversationId]: [...existing, message] };
//       });

//       setConversations(prev => {
//         const updated = prev.map(c => {
//           if (c.id !== conversationId) return c;
//           const isActive = activeConvRef.current?.id === conversationId;
//           if (isActive) socket.emit('message:read', { conversationId });
//           return {
//             ...c,
//             lastMessage: message,
//             lastMessageAt: message.createdAt,
//             unreadCount: isActive ? 0 : (c.unreadCount || 0) + 1,
//           };
//         });
//         return updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
//       });
//     });

//     // ── Edit ──
//     socket.on('message:edited', ({ message, conversationId }) => {
//       setMessages(prev => ({
//         ...prev,
//         [conversationId]: (prev[conversationId] || []).map(m => m.id === message.id ? message : m),
//       }));
//     });

//     // ── Delete ──
//     socket.on('message:deleted', ({ messageId, conversationId }) => {
//       setMessages(prev => ({
//         ...prev,
//         [conversationId]: (prev[conversationId] || []).map(m =>
//           m.id === messageId ? { ...m, deletedForEveryone: true, content: null } : m
//         ),
//       }));
//     });

//     // ── Read ──
//     socket.on('message:read', ({ conversationId }) => {
//       setConversations(prev =>
//         prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
//       );
//     });

//     // ── Typing ──
//     socket.on('typing:start', ({ conversationId, userId, username }) => {
//       setTypingUsers(prev => ({ ...prev, [conversationId]: { userId, username } }));
//     });

//     socket.on('typing:stop', ({ conversationId }) => {
//       setTypingUsers(prev => { const n = { ...prev }; delete n[conversationId]; return n; });
//     });

//     // ✅ FIXED: Reaction realtime update for BOTH sender and receiver
//     socket.on('message:reaction', ({ messageId, conversationId, reactions }) => {
//       setMessages(prev => ({
//         ...prev,
//         [conversationId]: (prev[conversationId] || []).map(m =>
//           m.id === messageId ? { ...m, reactions } : m
//         ),
//       }));
//     });

//     return () => {
//       socket.off('user:online');
//       socket.off('user:offline');
//       socket.off('message:new');
//       socket.off('message:edited');
//       socket.off('message:deleted');
//       socket.off('message:read');
//       socket.off('typing:start');
//       socket.off('typing:stop');
//       socket.off('message:reaction'); // ✅ cleanup
//     };
//   }, [socket, user]);

//   // ================= SEND MESSAGE =================
//   const sendMessage = async (receiverId, content, type = 'text', file = null, replyToId = null) => {
//     try {
//       const formData = new FormData();
//       formData.append('receiverId', receiverId);
//       if (content) formData.append('content', content);
//       formData.append('type', type);
//       if (replyToId) formData.append('replyToId', replyToId);
//       if (file) formData.append('file', file);

//       const res = await api.post('/messages', formData, {
//         headers: { 'Content-Type': 'multipart/form-data' },
//       });

//       const { message, conversationId } = res.data;

//       // 🔥 FORCE correct file field for realtime
// if (!message.file && message.fileUrl) {
//   message.file = message.fileUrl;
// }

//       setMessages(prev => {
//         const existing = prev[conversationId] || [];
//         if (existing.some(m => m.id === message.id)) return prev;
//         return { ...prev, [conversationId]: [...existing, message] };
//       });

//       setConversations(prev => {
//         const updated = prev.map(c => {
//           if (c.id !== conversationId) return c;
//           const isActive = activeConvRef.current?.id === conversationId;
//           if (isActive) socket?.emit('message:read', { conversationId });
//           return {
//             ...c,
//             lastMessage: message,
//             lastMessageAt: message.createdAt,
//             unreadCount: isActive ? 0 : (c.unreadCount || 0) + 1,
//           };
//         });
//         return updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
//       });
//        console.log('sending message:',message);
//       // socket?.emit('message:send', { message, receiverId, conversationId });
//       socket?.emit('message:send', {
//   message: {
//     ...message,
//     file: message.file || message.image || message.media || null // 🔥 FIX
//   },
//   receiverId,
//   conversationId
// });
//       return { message, conversationId };
//     } catch (err) {
//       toast.error('Failed to send message');
//       throw err;
//     }
//   };

//   const clearUnread = (convId) => {
//     setConversations(prev =>
//       prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c)
//     );
//   };

//   return (
//     <ChatContext.Provider value={{
//       conversations, setConversations,
//       activeConv, setActiveConv: setActiveConvSafe,
//       messages, setMessages,
//       loading,
//       pendingRequests, setPendingRequests,
//       friends, setFriends,
//       typingUsers,
//       onlineUsers,


//       loadConversations, loadMessages,
//       loadPendingRequests, loadFriends,
//       sendMessage, clearUnread,
//     }}>
//       {children}
//     </ChatContext.Provider>
//   );
// };

// export const useChat = () => {
//   const ctx = useContext(ChatContext);
//   if (!ctx) throw new Error('useChat must be used inside ChatProvider');
//   return ctx;
// };





import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user, socket } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const activeConvRef = useRef(null);
  const [messages, setMessages] = useState({});
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const setActiveConvSafe = useCallback((conv) => {
    activeConvRef.current = conv;
    setActiveConv(conv);
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const res = await api.get('/conversations');
      setConversations(res.data.conversations);
    } catch {}
  }, []);

  const loadMessages = useCallback(async (convId) => {
    setLoading(true);
    try {
      const res = await api.get(`/conversations/${convId}/messages`);
      setMessages(prev => ({ ...prev, [convId]: res.data.messages }));
    } catch {}
    setLoading(false);
  }, []);

  const loadPendingRequests = useCallback(async () => {
    try {
      const res = await api.get('/friends/pending');
      setPendingRequests(res.data.requests);
    } catch {}
  }, []);

  const loadFriends = useCallback(async () => {
    try {
      const res = await api.get('/friends');
      const friendsList = res.data.friends;
      setFriends(friendsList);
      const initialOnline = new Set(friendsList.filter(f => f.isOnline).map(f => f.id));
      setOnlineUsers(initialOnline);
    } catch {}
  }, []);

  useEffect(() => {
    if (user) {
      loadConversations();
      loadPendingRequests();
      loadFriends();
    }
  }, [user]);

  // ================= SOCKET EVENTS =================
  useEffect(() => {
    if (!socket) return;

    socket.on('user:online', ({ userId }) => {
      if (userId === user?.id) return;
      setOnlineUsers(prev => { const s = new Set(prev); s.add(userId); return s; });
      setFriends(prev => prev.map(f => f.id === userId ? { ...f, isOnline: true } : f));
    });

    socket.on('user:offline', ({ userId }) => {
      if (userId === user?.id) return;
      setOnlineUsers(prev => { const s = new Set(prev); s.delete(userId); return s; });
      setFriends(prev => prev.map(f => f.id === userId ? { ...f, isOnline: false } : f));
    });

    // ── New message ── ✅ FIXED: normalize file field for receiver
    socket.on('message:new', ({ message, conversationId }) => {
      const normalizedMessage = {
        ...message,
        file: message.file || message.fileUrl || null,
      };

      setMessages(prev => {
        const existing = prev[conversationId] || [];
        if (existing.some(m => m.id === normalizedMessage.id)) return prev;
        return { ...prev, [conversationId]: [...existing, normalizedMessage] };
      });

      setConversations(prev => {
        const updated = prev.map(c => {
          if (c.id !== conversationId) return c;
          const isActive = activeConvRef.current?.id === conversationId;
          if (isActive) socket.emit('message:read', { conversationId });
          return {
            ...c,
            lastMessage: normalizedMessage,
            lastMessageAt: normalizedMessage.createdAt,
            unreadCount: isActive ? 0 : (c.unreadCount || 0) + 1,
          };
        });
        return updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      });
    });

    socket.on('message:edited', ({ message, conversationId }) => {
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(m => m.id === message.id ? message : m),
      }));
    });

    socket.on('message:deleted', ({ messageId, conversationId }) => {
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(m =>
          m.id === messageId ? { ...m, deletedForEveryone: true, content: null } : m
        ),
      }));
    });

    socket.on('message:read', ({ conversationId }) => {
      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
      );
    });

    socket.on('typing:start', ({ conversationId, userId, username }) => {
      setTypingUsers(prev => ({ ...prev, [conversationId]: { userId, username } }));
    });

    socket.on('typing:stop', ({ conversationId }) => {
      setTypingUsers(prev => { const n = { ...prev }; delete n[conversationId]; return n; });
    });

    socket.on('message:reaction', ({ messageId, conversationId, reactions }) => {
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(m =>
          m.id === messageId ? { ...m, reactions } : m
        ),
      }));
    });

    return () => {
      socket.off('user:online');
      socket.off('user:offline');
      socket.off('message:new');
      socket.off('message:edited');
      socket.off('message:deleted');
      socket.off('message:read');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('message:reaction');
    };
  }, [socket, user]);

  // ================= SEND MESSAGE =================
  const sendMessage = async (receiverId, content, type = 'text', file = null, replyToId = null) => {
    try {
      const formData = new FormData();
      formData.append('receiverId', receiverId);
      if (content) formData.append('content', content);
      formData.append('type', type);
      if (replyToId) formData.append('replyToId', replyToId);
      if (file) formData.append('file', file);

      const res = await api.post('/messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { message, conversationId } = res.data;

      // ✅ Normalize file field for sender
      const normalizedMessage = {
        ...message,
        file: message.file || message.fileUrl || null,
      };

      setMessages(prev => {
        const existing = prev[conversationId] || [];
        if (existing.some(m => m.id === normalizedMessage.id)) return prev;
        return { ...prev, [conversationId]: [...existing, normalizedMessage] };
      });

      setConversations(prev => {
        const updated = prev.map(c => {
          if (c.id !== conversationId) return c;
          const isActive = activeConvRef.current?.id === conversationId;
          if (isActive) socket?.emit('message:read', { conversationId });
          return {
            ...c,
            lastMessage: normalizedMessage,
            lastMessageAt: normalizedMessage.createdAt,
            unreadCount: isActive ? 0 : (c.unreadCount || 0) + 1,
          };
        });
        return updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      });

      socket?.emit('message:send', {
        message: normalizedMessage,
        receiverId: Number(receiverId),
        conversationId,
      });

      return { message: normalizedMessage, conversationId };
    } catch (err) {
      toast.error('Failed to send message');
      throw err;
    }
  };

  const clearUnread = (convId) => {
    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c)
    );
  };

  return (
    <ChatContext.Provider value={{
      conversations, setConversations,
      activeConv, setActiveConv: setActiveConvSafe,
      messages, setMessages,
      loading,
      pendingRequests, setPendingRequests,
      friends, setFriends,
      typingUsers,
      onlineUsers,
      loadConversations, loadMessages,
      loadPendingRequests, loadFriends,
      sendMessage, clearUnread,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
};