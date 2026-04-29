import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Send, MessageSquare, Plus, X, Inbox, Clock, Trash2 } from 'lucide-react';
import { Conversation, ChatMessage, UserAccount } from '../types';

interface ChatPageProps {
  conversations: Conversation[];
  messages: ChatMessage[];
  currentUser: UserAccount;
  accounts: UserAccount[];
  onSendMessage: (conversationId: string, text: string) => void;
  onStartConversation: (participantIds: string[]) => void;
  onMarkRead: (conversationId: string) => void;
  onDeleteConversation?: (conversationId: string) => void;
}

const ChatPage: React.FC<ChatPageProps> = ({
  conversations,
  messages,
  currentUser,
  accounts,
  onSendMessage,
  onStartConversation,
  onMarkRead,
  onDeleteConversation
}) => {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = useMemo(() => 
    conversations.find(c => c.id === selectedConvId),
  [conversations, selectedConvId]);

  const activeMessages = useMemo(() => 
    messages.filter(m => m.conversationId === selectedConvId),
  [messages, selectedConvId]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const otherParticipants = Object.values(c.participantNames).join(' ');
      return otherParticipants.toLowerCase().includes(searchTerm.toLowerCase());
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [conversations, searchTerm]);

  useEffect(() => {
    if (selectedConvId) {
      onMarkRead(selectedConvId);
    }
  }, [selectedConvId, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && selectedConvId) {
      onSendMessage(selectedConvId, newMessage.trim());
      setNewMessage('');
    }
  };

  const getOtherParticipantName = (conv: Conversation) => {
    const others = conv.participantIds.filter(id => id !== currentUser.id);
    if (others.length === 0) return 'Me (Self)';
    
    // Check if we have names in participantNames mapping
    const names = others.map(id => conv.participantNames?.[id] || accounts.find(a => a.id === id)?.name || 'Unknown User');
    return names.join(', ');
  };

  const getParticipantInitials = (conv: Conversation) => {
    const name = getOtherParticipantName(conv);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
      {/* Sidebar - Conversations List */}
      <div className="w-80 border-r border-neutral-200 flex flex-col bg-neutral-50/30">
        <div className="p-4 border-b border-neutral-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-neutral-900">Messages</h2>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2 bg-neutral-900 text-white rounded-full hover:bg-black transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 bg-neutral-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-neutral-200 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-neutral-400">
              <MessageSquare size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">No conversations found</p>
            </div>
          ) : (
            filteredConversations.map(conv => {
              const unread = conv.unreadCount?.[currentUser.id] || 0;
              const isSelected = conv.id === selectedConvId;
              
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`w-full p-4 flex items-start gap-3 transition-all border-b border-neutral-100/50 ${
                    isSelected ? 'bg-white shadow-sm ring-1 ring-neutral-200/50 z-10' : 'hover:bg-neutral-100/50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <span className="text-neutral-500 font-bold text-sm">{getParticipantInitials(conv)}</span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className={`text-sm font-bold truncate ${unread > 0 ? 'text-neutral-900' : 'text-neutral-700'}`}>
                        {getOtherParticipantName(conv)}
                      </h4>
                      {conv.updatedAt && (
                        <span className="text-[10px] text-neutral-400 whitespace-nowrap ml-2">
                          {formatTime(conv.updatedAt)}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate ${unread > 0 ? 'text-neutral-900 font-bold' : 'text-neutral-500'}`}>
                      {conv.lastMessage?.text || 'No messages yet'}
                    </p>
                  </div>
                  {unread > 0 && (
                    <div className="w-5 h-5 bg-neutral-900 rounded-full flex items-center justify-center flex-shrink-0 ml-1">
                      <span className="text-[10px] font-black text-white">{unread}</span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConvId && activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-white text-xs font-black">
                  {getParticipantInitials(activeConversation)}
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900">{getOtherParticipantName(activeConversation)}</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Active Now</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-full transition-all">
                  <Clock size={20} />
                </button>
                <button 
                  onClick={() => onDeleteConversation?.(selectedConvId)}
                  className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-neutral-50/30">
              {activeMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-neutral-400 opacity-40">
                  <Inbox size={48} className="mb-4" />
                  <p className="text-sm font-medium">Start the conversation</p>
                </div>
              ) : (
                activeMessages.map((msg, idx) => {
                  const isMe = msg.senderId === currentUser.id;
                  const showAvatar = idx === 0 || activeMessages[idx - 1].senderId !== msg.senderId;
                  
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                      {!isMe && (
                        <div className={`w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0 overflow-hidden ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                          <span className="text-neutral-500 text-[10px] font-bold">
                            {msg.senderName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                          </span>
                        </div>
                      )}
                      <div className={`max-w-[70%] group`}>
                        {!isMe && showAvatar && (
                          <span className="text-[10px] font-bold text-neutral-400 ml-1 mb-1 block uppercase tracking-wider">
                            {msg.senderName}
                          </span>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm transition-all ${
                          isMe 
                            ? 'bg-neutral-900 text-white rounded-br-none' 
                            : 'bg-white text-neutral-800 border border-neutral-200 rounded-bl-none'
                        }`}>
                          {msg.text}
                        </div>
                        <span className={`text-[9px] font-medium text-neutral-400 mt-1 block opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'text-right' : 'text-left'}`}>
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-neutral-200 bg-white">
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-neutral-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-neutral-200 transition-all"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 bg-neutral-900 text-white rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-neutral-50/30">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8 transform rotate-3">
              <MessageSquare size={48} className="text-neutral-900" />
            </div>
            <h2 className="text-2xl font-black text-neutral-900 mb-3">Your Inbox</h2>
            <p className="text-neutral-500 max-w-xs leading-relaxed mb-8">
              Send messages and collaborate with other personnel across all branches in real-time.
            </p>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="px-8 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-2"
            >
              <Plus size={20} />
              Start New Chat
            </button>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChatModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                <h3 className="text-xl font-black text-neutral-900 uppercase tracking-tight">New Message</h3>
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-white rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search personnel..."
                    className="w-full pl-10 pr-4 py-3 bg-neutral-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-neutral-200 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="max-h-80 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                  {accounts
                    .filter(acc => acc.id !== currentUser.id && acc.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(acc => (
                      <button
                        key={acc.id}
                        onClick={() => {
                          onStartConversation([currentUser.id, acc.id]);
                          setShowNewChatModal(false);
                          setSearchTerm('');
                        }}
                        className="w-full p-3 flex items-center gap-3 hover:bg-neutral-50 rounded-2xl transition-all group"
                      >
                        <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center overflow-hidden group-hover:bg-neutral-900 group-hover:text-white transition-all duration-300">
                          <span className="text-xs font-bold uppercase">
                            {acc.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                          </span>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-neutral-900">{acc.name}</p>
                          <p className="text-[10px] text-neutral-400 uppercase font-black tracking-widest">{acc.role}</p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatPage;
