import React, { useState } from 'react';
import Sidebar from '../components/chat/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import { useChat } from '../context/ChatContext';

const Home = () => {
  const { activeConv, setActiveConv, loadMessages } = useChat();
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const handleSelectConv = (conv) => {
    setActiveConv(conv);
    loadMessages(conv.id);
    setMobileShowChat(true);
  };

  const handleBack = () => {
    setMobileShowChat(false);
    setActiveConv(null);
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <div className={`
        ${mobileShowChat ? 'hidden' : 'flex'} md:flex
        border-r border-[var(--border)]
      `}>
        <Sidebar onSelectConv={handleSelectConv} />
      </div>

      {/* Chat Window */}
      <div className={`
        ${!mobileShowChat ? 'hidden' : 'flex'} md:flex
        flex-1 overflow-hidden
      `}>
        <ChatWindow conv={activeConv} onBack={handleBack} />
      </div>
    </div>
  );
};

export default Home;
