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
  const conversationsRef = useRef([]);

  const syncUnreadCount = useCallback((conversationId, count) => {
    const normalizedId = Number(conversationId);
    const nextCount = Number(count) || 0;

    setConversations(prev =>
      prev.map(c =>
        Number(c.id) === normalizedId ? { ...c, unreadCount: nextCount } : c
      )
    );
  }, []);

  const incrementUnreadCount = useCallback((conversationId) => {
    const normalizedId = Number(conversationId);

    setConversations(current =>
      current.map(c =>
        Number(c.id) === normalizedId
          ? { ...c, unreadCount: (Number(c.unreadCount) || 0) + 1 }
          : c
      )
    );
  }, []);

  const setActiveConvSafe = useCallback((conv) => {
    activeConvRef.current = conv;
    setActiveConv(conv);
  }, []);

  const clearUnread = useCallback((convId) => {
    syncUnreadCount(convId, 0);
  }, [syncUnreadCount]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    if (!activeConv?.id) return;
    clearUnread(activeConv.id);
  }, [activeConv, clearUnread]);

  // const loadConversations = useCallback(async () => {
  //   try {
  //     const res = await api.get('/conversations');
  //     setConversations(res.data.conversations);
  //   } catch {}
  // }, []);
  const loadConversations = useCallback(async () => {
  try {
    const res = await api.get('/conversations');
    const convs = res.data.conversations;
    const activeConversationId = Number(activeConvRef.current?.id);

    setConversations(
  convs.map(c => ({
    ...c,
    unreadCount:
      Number(c.id) === activeConversationId
        ? 0
        : (Number(c.unreadCount) || 0)
  }))
);

// ✅ 2. 🔥 SYNC REALTIME UNREAD STATE
  } catch {}
}, [socket]);

  const loadMessages = useCallback(async (convId) => {
    setLoading(true);
    try {
      const res = await api.get(`/conversations/${convId}/messages`);
      setMessages(prev => ({ ...prev, [convId]: res.data.messages }));
      if (Number(activeConvRef.current?.id) === Number(convId)) {
        clearUnread(convId);
      }
    } catch {}
    setLoading(false);
  }, [clearUnread]);

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

  // ================= JOIN / LEAVE SOCKET ROOM =================
useEffect(() => {
  if (!socket || !activeConv?.id) return;

  console.log("✅ Joining room:", activeConv.id);

  socket.emit('conversation:join', `conv:${activeConv.id}`);

  return () => {
    console.log("❌ Leaving room:", activeConv.id);
    socket.emit('conversation:leave', `conv:${activeConv.id}`);
  };
}, [socket, activeConv]);


  

  // ================= SOCKET EVENTS =================
  // useEffect(() => {
  //   if (!socket) return;
  
  useEffect(() => {
  if (!socket || !user) return;

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

//     socket.on("friend:request", ({ request }) => {
//   setPendingRequests(prev => [request, ...prev]);
// });

       socket.on("friend:request", ({ request }) => {
        console.log("✅ RECEIVED FRIEND REQUEST:", request);
  setPendingRequests(prev => {
    if (prev.some(r => r.id === request.id)) return prev;
    return [request, ...prev];
  });
});

socket.on("friend:response", ({ request }) => {
  setPendingRequests(prev => prev.filter(r => r.id !== request.id));

  if (request.status === "accepted") {
    loadFriends(); // refresh friend list
    //loadConversations(); // new chat created
  }
});


// socket.on('message:new', ({ message, conversationId }) => {

//   console.log("Incoming:", conversationId);
// console.log("My conversations:", conversations);
 
//   const normalizedMessage = {
//     ...message,
//     file: message.file || message.fileUrl || null,
//   };

//   // ✅ update messages
//   setMessages(prev => {
//     const existing = prev[conversationId] || [];
//     if (existing.some(m => m.id === normalizedMessage.id)) return prev;

//     return {
//       ...prev,
//       [conversationId]: [...existing, normalizedMessage],
//     };
//   });

//   // ✅ update sidebar (THIS FIXES UNREAD COUNT 🔥)
//   setConversations(prev =>
//     prev
//       .map(c => {
//         if (Number(c.id) !== Number(conversationId)) return c;

//         const isActive = Number(activeConvRef.current?.id) === Number(conversationId);

//         return {
//           ...c,
//           lastMessage: normalizedMessage,
//           lastMessageAt: normalizedMessage.createdAt,
//           unreadCount: isActive ? 0 : (c.unreadCount || 0) + 1,
//         };
//       })
//       .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
//     );
//         // 🔥 STEP 5 ADD HERE
//       if (activeConvRef.current?.id === conversationId) {
//         socket?.emit('message:read', { conversationId });
//       }
  
// });

socket.on('message:new', ({ message, conversationId }) => {

  console.log("📩 Incoming:", conversationId);

  const normalizedMessage = {
    ...message,
    file: message.file || message.fileUrl || null,
  };
  const normalizedConversationId = Number(conversationId);
  const isOwnMessage = Number(normalizedMessage.senderId) === Number(user?.id);
  const isActive =
    Number(activeConvRef.current?.id) === normalizedConversationId;
  let isDuplicateMessage = false;
  const existingConversation = conversationsRef.current.find(
    c => Number(c.id) === normalizedConversationId
  );

  // ✅ 1. Update messages (per conversation)
  setMessages(prev => {
    const existing = prev[conversationId] || [];

    if (existing.some(m => m.id === normalizedMessage.id)) {
      isDuplicateMessage = true;
      return prev;
    }

    return {
      ...prev,
      [conversationId]: [...existing, normalizedMessage],
    };
  });

  if (isDuplicateMessage) return;

  // ✅ 2. Update unread count separately (🔥 IMPORTANT)
  if (isActive || isOwnMessage) {
    clearUnread(normalizedConversationId);
    if (!isOwnMessage) {
      socket?.emit('message:read', { conversationId: normalizedConversationId });
    }
  } else {
    incrementUnreadCount(normalizedConversationId);
  }

  // ✅ 3. Update sidebar (clean + reliable)
  setConversations(prev => {
    if (!existingConversation) {
      const nextUnreadCount = isActive || isOwnMessage ? 0 : 1;

      const newConversation = {
        id: normalizedConversationId,
        otherUser:
          existingConversation?.otherUser ||
          (!isOwnMessage ? normalizedMessage.sender || null : null),
        lastMessage: normalizedMessage,
        lastMessageAt: normalizedMessage.createdAt,
        unreadCount: nextUnreadCount,
      };

      return [newConversation, ...prev];
    }

    const updated = prev.map(c => {
      if (Number(c.id) !== normalizedConversationId) return c;

      return {
        ...c,
        lastMessage: normalizedMessage,
        lastMessageAt: normalizedMessage.createdAt,
      };
    });

    // move active conversation to top
    const current = updated.find(c => Number(c.id) === normalizedConversationId);
    const others = updated.filter(c => Number(c.id) !== normalizedConversationId);

    return current ? [current, ...others] : prev;
  });

  if (!existingConversation) {
    loadConversations();
  }

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

    socket.on('typing:start', ({ conversationId, userId, username }) => {
      if (userId === user?.id) return;
      setTypingUsers(prev => ({ ...prev, [conversationId]: { userId, username } }));
   
    // 🔥 auto remove after 2 sec
  setTimeout(() => {
    setTypingUsers(prev => {
      const copy = { ...prev };
      delete copy[conversationId];
      return copy;
    });
  }, 2000);

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
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('message:reaction');
      
      
    };
  }, [socket, user, clearUnread, incrementUnreadCount, loadConversations, loadFriends]);

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
          if (isActive) clearUnread(conversationId);
          return {
            ...c,
            lastMessage: normalizedMessage,
            lastMessageAt: normalizedMessage.createdAt,
            unreadCount: 0,
          };
        });
        return updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      });

      return { message: normalizedMessage, conversationId };
    } catch (err) {
      toast.error('Failed to send message');
      throw err;
    }
  };

  const sendTyping = (conversationId) => {
  if (!socket || !user) return;

  socket.emit("typing:start", {
    conversationId,
    userId: user.id,
    username: user.username,
  });

  setTimeout(() => {
    socket.emit("typing:stop", { conversationId });
  }, 1000);
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
      sendMessage,sendTyping, clearUnread,
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
