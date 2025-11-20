import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  Send, 
  Search, 
  MessageCircle, 
  User as UserIcon,
  X,
  Paperclip,
  Image as ImageIcon,
  Check,
  CheckCheck
} from 'lucide-react';

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations and all users
  useEffect(() => {
    loadConversations();
    loadAllUsers();
    // Poll for new messages every 5 seconds
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load messages when user is selected
  useEffect(() => {
    if (selectedUser) {
      loadMessages(selectedUser._id);
      // Poll for new messages every 3 seconds when chat is open
      const interval = setInterval(() => loadMessages(selectedUser._id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  const loadConversations = async () => {
    try {
      const response = await api.getConversations();
      setConversations(response.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await api.listUsers();
      // Filter out current user
      const otherUsers = (response.users || []).filter(u => u._id !== user.id);
      setAllUsers(otherUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadMessages = async (userId) => {
    try {
      const response = await api.getMessages(userId);
      setMessages(response.messages || []);
      // Mark messages as read
      await api.markMessagesAsRead(userId);
      // Reload conversations to update unread count
      loadConversations();
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      setSending(true);
      await api.sendMessage({
        recipient: selectedUser._id,
        content: newMessage.trim()
      });
      setNewMessage('');
      loadMessages(selectedUser._id);
      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSelectUser = (conversationUser) => {
    setSelectedUser(conversationUser);
  };

  // Merge conversations with all users
  // Users with conversations go first (sorted by last message), then others alphabetically
  const getUserList = () => {
    // Use Map to deduplicate by user ID
    const userMap = new Map();
    
    // First, add users with conversations (priority)
    conversations.forEach(conv => {
      if (conv.user && conv.user._id && !userMap.has(conv.user._id)) {
        userMap.set(conv.user._id, {
          ...conv.user,
          hasConversation: true,
          lastMessage: conv.lastMessage,
          unreadCount: conv.unreadCount || 0
        });
      }
    });
    
    // Then add users without conversations
    allUsers.forEach(u => {
      if (u && u._id && !userMap.has(u._id)) {
        userMap.set(u._id, {
          ...u,
          hasConversation: false,
          lastMessage: null,
          unreadCount: 0
        });
      }
    });
    
    // Convert Map to array, conversations first (already in order), then sort others
    const usersWithChats = [];
    const usersWithoutChats = [];
    
    userMap.forEach(user => {
      if (user.hasConversation) {
        usersWithChats.push(user);
      } else {
        usersWithoutChats.push(user);
      }
    });
    
    // Sort users without chats alphabetically
    usersWithoutChats.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    return [...usersWithChats, ...usersWithoutChats];
  };

  const filteredConversations = getUserList().filter(user => 
    user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user?.designation?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const formatMessageTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <MessageCircle size={48} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Conversations List */}
      <div className="w-80 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-navy mb-3">Messages</h2>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle size={48} className="mx-auto mb-3 text-gray-300" />
              <p>No colleagues found</p>
              <p className="text-sm mt-1">Try adjusting your search</p>
            </div>
          ) : (
            filteredConversations.map((colleague) => (
              <div
                key={colleague._id}
                onClick={() => handleSelectUser(colleague)}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition ${
                  selectedUser?._id === colleague._id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                } ${
                  colleague.hasConversation ? 'bg-gradient-to-r from-blue-50/30 to-transparent' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <img
                      src={colleague.avatar}
                      alt={colleague.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {colleague.hasConversation && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-navy truncate">{colleague.name}</h3>
                      {colleague.lastMessage && (
                        <span className="text-xs text-gray-500">
                          {formatTime(colleague.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {colleague.designation || colleague.role}
                    </p>
                    {colleague.lastMessage && (
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {colleague.lastMessage.sender.toString() === user.id ? 'You: ' : ''}
                        {colleague.lastMessage.content}
                      </p>
                    )}
                    {colleague.unreadCount > 0 && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                        {colleague.unreadCount} new
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold text-navy">{selectedUser.name}</h3>
                  <p className="text-sm text-gray-500">{selectedUser.designation || selectedUser.role}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition md:hidden"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MessageCircle size={48} className="mx-auto mb-3 text-gray-300" />
                    <p>No messages yet</p>
                    <p className="text-sm mt-1">Send a message to start the conversation</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => {
                    // Ensure proper ID comparison (both as strings)
                    const senderId = msg.sender?._id?.toString() || msg.sender?.toString();
                    const currentUserId = user?.id?.toString() || user?._id?.toString();
                    const isOwn = senderId === currentUserId;
                    
                    // Debug log (remove after testing)
                    if (messages.length > 0 && msg === messages[0]) {
                      console.log('Message alignment debug:', { senderId, currentUserId, isOwn });
                    }
                    
                    return (
                      <div
                        key={msg._id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                          {!isOwn && (
                            <img
                              src={msg.sender.avatar}
                              alt={msg.sender.name}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          )}
                          <div>
                            <div
                              className={`p-3 rounded-lg ${
                                isOwn
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-white text-gray-800 border'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            </div>
                            <div className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${isOwn ? 'justify-end' : ''}`}>
                              <span>{formatMessageTime(msg.createdAt)}</span>
                              {isOwn && (
                                <span>
                                  {msg.isRead ? (
                                    <CheckCheck size={14} className="text-blue-400" />
                                  ) : (
                                    <Check size={14} className="text-gray-400" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
              <div className="flex items-center gap-2">
                <input
                  ref={messageInputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle size={64} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Select a conversation</h3>
              <p>Choose a colleague from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
