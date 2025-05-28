import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  PlusIcon, 
  ChatBubbleLeftRightIcon,
  PaperClipIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import Button from '../components/common/Button.jsx';
import Modal from '../components/common/Modal.jsx';
import websocketService from '../services/websocketService';

const CollaborationHub = () => {
  const { user, token } = useSelector(state => state.auth);
  const [conversations, setConversations] = useState([
    {
      id: 'conv1',
      name: 'Design Team',
      lastMessage: 'Hey everyone, how\'s the project going?',
      timestamp: '2 min ago',
      unread: 2,
      participants: ['Alice', 'Bob', 'David']
    },
    {
      id: 'conv2', 
      name: 'Marketing Discussion',
      lastMessage: 'We should definitely explore this new trend',
      timestamp: '1 hour ago',
      unread: 0,
      participants: ['Carol', 'Eve']
    },
    {
      id: 'conv3',
      name: 'Product Review',
      lastMessage: 'The latest prototype looks promising',
      timestamp: '3 hours ago', 
      unread: 5,
      participants: ['Frank', 'Grace', 'Henry']
    }
  ]);
  
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    // Connect to WebSocket when component mounts
    if (token) {
      websocketService.connect(token);
    }

    // Set up WebSocket event handlers
    const handleChatMessage = (data) => {
      console.log('Chat message received:', data);
      setMessages(prev => [...prev, {
        id: data.id,
        sender: data.author?.username || 'Unknown',
        text: data.content,
        timestamp: data.timeAgo || 'Just now',
        isOwn: data.author?.userId === user?.id
      }]);
    };

    const handleUserTyping = (data) => {
      console.log('User typing:', data);
      if (data.isTyping) {
        setTypingUsers(prev => [...prev.filter(u => u.userId !== data.userId), data]);
      } else {
        setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
      }
    };

    const handleConnected = () => {
      console.log('WebSocket connected for collaboration');
    };

    const handleDisconnected = () => {
      console.log('WebSocket disconnected from collaboration');
    };

    // Register event handlers
    websocketService.on('chat-message', handleChatMessage);
    websocketService.on('user-typing', handleUserTyping);
    websocketService.on('connected', handleConnected);
    websocketService.on('disconnected', handleDisconnected);

    // Cleanup event handlers on unmount
    return () => {
      websocketService.off('chat-message', handleChatMessage);
      websocketService.off('user-typing', handleUserTyping);
      websocketService.off('connected', handleConnected);
      websocketService.off('disconnected', handleDisconnected);
    };
  }, [token, user?.id]);

  useEffect(() => {
    // Simulate loading messages for selected conversation
    if (selectedConversation) {
      setMessages([
        {
          id: 1,
          sender: 'Alice',
          text: 'Hey everyone, how\'s the project going?',
          timestamp: '2 min ago',
          isOwn: false
        },
        {
          id: 2,
          sender: 'Bob',
          text: 'Looking good! We\'re making great progress',
          timestamp: '1 min ago',
          isOwn: false
        },
        {
          id: 3,
          sender: 'You',
          text: 'That\'s awesome to hear!',
          timestamp: 'Just now',
          isOwn: true
        }
      ]);
    }
  }, [selectedConversation]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        sender: 'You',
        text: newMessage.trim(),
        timestamp: 'Just now',
        isOwn: true
      };
      setMessages([...messages, message]);
      
      // Send via WebSocket if connected
      if (websocketService.isConnected() && selectedConversation) {
        websocketService.sendChatMessage(newMessage.trim(), selectedConversation.id);
      }
      
      setNewMessage('');
    }
  };

  const handleTypingStart = () => {
    if (!isTyping && selectedConversation) {
      setIsTyping(true);
      websocketService.sendTypingStart(selectedConversation.id);
    }
  };

  const handleTypingStop = () => {
    if (isTyping && selectedConversation) {
      setIsTyping(false);
      websocketService.sendTypingStop(selectedConversation.id);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypingText = () => {
    if (typingUsers.length === 0) return '';
    if (typingUsers.length === 1) return `${typingUsers[0].username} is typing...`;
    if (typingUsers.length === 2) return `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`;
    return `${typingUsers.length} people are typing...`;
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversations List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Chats</h2>
            <Button
              variant="outline" 
              size="small"
              onClick={() => setShowNewChatModal(true)}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              New Chat
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation)}
              className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
                selectedConversation?.id === conversation.id ? 'bg-primary-50 border-r-2 border-primary-600' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {conversation.name}
                  </h3>
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {conversation.lastMessage}
                  </p>
                  <div className="flex items-center mt-1 space-x-2">
                    <span className="text-xs text-gray-500">{conversation.timestamp}</span>
                    <span className="text-xs text-gray-400">
                      {conversation.participants.length} members
                    </span>
                  </div>
                </div>
                {conversation.unread > 0 && (
                  <div className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {conversation.unread}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedConversation.name}</h3>
                  <p className="text-sm text-gray-600">
                    {selectedConversation.participants.length} participants
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="small">
                    <PaperClipIcon className="h-4 w-4 mr-1" />
                    Attach
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.isOwn
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    {!message.isOwn && (
                      <div className="text-xs font-medium mb-1 opacity-75">
                        {message.sender}
                      </div>
                    )}
                    <div className="text-sm">{message.text}</div>
                    <div className={`text-xs mt-1 ${message.isOwn ? 'text-primary-100' : 'text-gray-500'}`}>
                      {message.timestamp}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Typing indicator */}
              {getTypingText() && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm">
                    {getTypingText()}
                  </div>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                  <PaperClipIcon className="h-5 w-5" />
                </button>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    if (e.target.value.trim()) {
                      handleTypingStart();
                    } else {
                      handleTypingStop();
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleTypingStop();
                      handleSendMessage();
                    }
                  }}
                  onBlur={handleTypingStop}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <Button onClick={handleSendMessage} size="small">
                  Send
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-600">Choose from your existing chats or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <Modal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        title="Start New Conversation"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conversation Name
            </label>
            <input
              type="text"
              placeholder="Enter conversation name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Participants (comma separated)
            </label>
            <input
              type="text"
              placeholder="username1, username2, username3..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex space-x-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowNewChatModal(false)}>
              Cancel
            </Button>
            <Button className="flex-1">
              Create Chat
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CollaborationHub;