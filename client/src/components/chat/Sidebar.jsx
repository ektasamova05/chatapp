import React, { useState, useEffect } from 'react';
import { MessageCircle, Users, Search, Bell, LogOut, UserPlus, Check, X, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import Avatar from '../ui/Avatar';
import ProfileModal from '../profile/ProfileModal';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatConversationDate, truncate } from '../../utils/helpers';

const Sidebar = ({ onSelectConv }) => {
  const { user, logout, socket } = useAuth();
  const { conversations, pendingRequests, friends, loadConversations, setPendingRequests, loadFriends, activeConv, setActiveConv, clearUnread } = useChat();

  const [tab, setTab] = useState('chats');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [viewProfile, setViewProfile] = useState(null);

  useEffect(() => {
    if (!socket) return;

    // const handleNewRequest = ({ request }) => {
    //   setPendingRequests((prev) => [request, ...prev]);
    // };

    const handleResponse = ({ request }) => {
      setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));
      if (request.status === 'accepted') {
        loadFriends();
        loadConversations();
      }
    };

    socket.on('friend:response', handleResponse);
    
    return () => {
      socket.off('friend:response', handleResponse);
    };
  }, [socket, loadConversations, loadFriends, setPendingRequests]);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await api.get('/friends/pending');
        setPendingRequests(res.data.requests);
      } catch (err) {
        console.log(err);
      }
    };
    fetchPending();
  }, []);

  const handleSearch = async (q) => {
    setSearch(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data.users);
    } catch {}
    setSearching(false);
  };

  const sendRequest = async (userId) => {
    try {
      const res = await api.post('/friends/request', { receiverId: userId });
      // socket?.emit('friend:request', { request: res.data.request, receiverId: userId });
      toast.success('Request sent!');
      setSearchResults(prev => prev.map(u => u.id === userId
        ? { ...u, friendStatus: 'pending', isSender: true } : u));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const respondRequest = async (requestId, status, senderId) => {
    try {
      const res = await api.put(`/friends/request/${requestId}`, { status });
      socket?.emit('friend:response', { request: res.data.request, senderId });
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      if (status === 'accepted') {
        loadFriends();
        loadConversations();
        toast.success('Request accepted!');
      } else {
        toast('Request rejected', { icon: '👋' });
      }
    } catch {}
  };

  // ✅ Start chat from friends list
  const startChat = (friend) => {
    const existingConv = conversations.find(c => c.otherUser?.id === friend.id);
    if (existingConv) {
      onSelectConv(existingConv);
      setTab('chats');
    } else {
      toast('Send a message to start chatting!', { icon: '💬' });
    }
  };

  const tabs = [
    { id: 'chats', icon: MessageCircle, label: 'Chats' },
    { id: 'friends', icon: Users, label: 'Friends' },
    { id: 'requests', icon: Bell, label: 'Requests', badge: pendingRequests.length },
  ];

  return (
    <div className="w-80 h-full flex flex-col" style={{ background: 'var(--sidebar)' }}>

      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center">
              <MessageCircle size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">ChatApp</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowProfile(true)}
              className="p-1.5 hover:bg-[var(--hover)] rounded-lg transition-colors">
              <Avatar user={user} size="sm" showOnline />
            </button>
            <button onClick={logout}
              className="p-2 hover:bg-[var(--hover)] rounded-lg transition-colors text-[var(--muted)] hover:text-red-400">
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input type="text" placeholder="Search users..." value={search}
            onChange={e => handleSearch(e.target.value)}
            className="input-base pl-9 py-2.5 text-sm" />
        </div>
      </div>

      {/* Search Results */}
      {search && (
        <div className="flex-1 overflow-y-auto p-2">
          {searching ? (
            <div className="text-center py-8 text-[var(--muted)] text-sm">Searching...</div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted)] text-sm">No users found</div>
          ) : searchResults.map(u => (
            <div key={u.id}
              className="flex items-center gap-3 p-3 hover:bg-[var(--hover)] rounded-xl cursor-pointer transition-colors"
              onClick={() => setViewProfile(u)}>
              <Avatar user={u} size="sm" showOnline />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[var(--text)] truncate">{u.username}</p>
                <p className="text-xs text-[var(--muted)] truncate">{u.bio || 'No bio'}</p>
              </div>
              {!u.friendStatus && (
                <button onClick={e => { e.stopPropagation(); sendRequest(u.id); }}
                  className="p-1.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-white transition-colors">
                  <UserPlus size={14} />
                </button>
              )}
              {u.friendStatus === 'pending' && u.isSender && (
                <span className="text-xs text-[var(--muted)] flex items-center gap-1"><Clock size={12} /> Sent</span>
              )}
              {u.friendStatus === 'pending' && !u.isSender && (
                <span className="text-xs text-yellow-400">Pending</span>
              )}
              {u.friendStatus === 'accepted' && (
                <span className="text-xs text-green-400">Friends</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      {!search && (
        <>
          <div className="flex border-b border-[var(--border)]">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 relative transition-colors
                  ${tab === t.id ? 'text-violet-400 border-b-2 border-violet-500' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}>
                <t.icon size={14} />
                {t.label}
                {t.badge > 0 && (
                  <span className="badge text-[9px] min-w-[15px] h-[15px]">{t.badge}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-2">

            {/* ── Chats Tab ── */}
            {tab === 'chats' && (
              conversations.length === 0 ? (
                <div className="text-center py-12 text-[var(--muted)] text-sm">
                  <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
                  No conversations yet
                </div>
              ) : conversations.map(conv => (
                <div key={conv.id}
                 onClick={() => {
                    setActiveConv(conv); 
                    onSelectConv(conv);
                    clearUnread(conv.id);

                    // // ✅ instant UI update
                    // setConversations(prev =>
                    //   prev.map(c =>
                    //     c.id === conv.id ? { ...c, unreadCount: 0 } : c
                    //   )
                    // );

                    // ✅ notify backend
                    socket?.emit('message:read', {
                      conversationId: conv.id,
                    });
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ripple
                    ${activeConv?.id === conv.id ? 'bg-violet-600/20 border border-violet-500/30' : 'hover:bg-[var(--hover)]'}`}>

                  <Avatar user={conv.otherUser} size="md" showOnline />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm text-[var(--text)] truncate">{conv.otherUser?.username}</p>
                      <span className="text-[10px] text-[var(--muted)] flex-shrink-0 ml-1">
                        {formatConversationDate(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-[var(--muted)] truncate">
                        {conv.lastMessage?.content ? truncate(conv.lastMessage.content, 30) : 'No messages'}
                      </p>
                        {/* {conv.unreadCount > 0 && (
                      <span className="badge">
                        {conv.unreadCount}
                      </span> */}
                     {activeConv?.id !== conv.id && (conv.unreadCount ?? 0) > 0 && (
                      <span className="badge">
                        {conv.unreadCount ?? 0}
                      </span>
                    )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* ── Friends Tab ✅ ADDED ── */}
            {tab === 'friends' && (
              friends.length === 0 ? (
                <div className="text-center py-12 text-[var(--muted)] text-sm">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  No friends yet
                </div>
              ) : friends.map(friend => (
                <div key={friend.id}
                  className="flex items-center gap-3 p-3 hover:bg-[var(--hover)] rounded-xl cursor-pointer transition-colors"
                  onClick={() => setViewProfile(friend)}>
                  <Avatar user={friend} size="md" showOnline />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--text)] truncate">{friend.username}</p>
                    <p className="text-xs text-[var(--muted)] truncate">
                      {friend.isOnline
                        ? <span className="text-green-400">● Online</span>
                        : friend.bio || 'No bio'}
                    </p>
                  </div>
                  {/* ✅ Chat button */}
                  <button
                    onClick={e => { e.stopPropagation(); startChat(friend); }}
                    className="p-1.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-white transition-colors"
                    title="Send message">
                    <MessageCircle size={14} />
                  </button>
                </div>
              ))
            )}

            {/* ── Requests Tab ── */}
            {tab === 'requests' && (
              pendingRequests.length === 0 ? (
                <div className="text-center py-12 text-[var(--muted)] text-sm">
                  No pending requests
                </div>
              ) : pendingRequests.map(req => (
                <div key={req.id}
                  className="flex items-center gap-3 p-3 hover:bg-[var(--hover)] rounded-xl">
                  <Avatar user={req.sender} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{req.sender.username}</p>
                    <p className="text-xs text-[var(--muted)]">{req.sender.bio}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => respondRequest(req.id, 'accepted', req.sender.id)}
                      className="p-1.5 bg-green-600 rounded-lg text-white text-xs px-2">
                      Accept
                    </button>
                    <button
                      onClick={() => respondRequest(req.id, 'rejected', req.sender.id)}
                      className="p-1.5 bg-red-600 rounded-lg text-white text-xs px-2">
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}

          </div>
        </>
      )}

      {showProfile && <ProfileModal user={user} isOwn onClose={() => setShowProfile(false)} />}
      {viewProfile && <ProfileModal user={viewProfile} isOwn={false} onClose={() => setViewProfile(null)} />}
    </div>
  );
};

export default Sidebar;
