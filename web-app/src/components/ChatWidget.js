import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';
import Axios from 'axios';
import { MessageSquare, X, Send, User, Bot, UserSquare, Check, CheckCheck, LogOut } from 'lucide-react';
import { API_URL } from '../config';
import './ChatWidget.css';

// Establish socket connection outside the component
const socket = io(API_URL);

export default function ChatWidget({ room = null, currentUser = 'Guest', userName = 'Guest User', customerName = '', isAdminMode = false, initialMessages = null }) {
  // Initialize state from sessionStorage or defaults
  const [isOpen, setIsOpen] = useState(isAdminMode ? true : false);

  // Operating Hours Check: Uncomment ONE of the two lines below
  const currentHour = new Date().getHours();
  const isShopOpen = true; // Always available (for testing)
  // const isShopOpen = currentHour >= 13 && currentHour < 20; // Shop hours: 1 PM - 8 PM

  // Track unique session ID for customers
  const [sessionId] = useState(() => {
    if (isAdminMode && room) return room;
    const savedId = sessionStorage.getItem('chat_sessionId');
    if (savedId) return savedId;
    const newId = 'guest_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('chat_sessionId', newId);
    return newId;
  });

  // Ensure AdminMode uses the passed room prop, Guests use their unique session or passed room
  const activeRoom = isAdminMode ? room : (room || sessionId);

  const [isHumanMode, setIsHumanMode] = useState(() => {
    if (isAdminMode) return true;
    const saved = sessionStorage.getItem('chat_isHumanMode');
    return saved !== null ? JSON.parse(saved) : false;
  });

  // AI Bot Messages State
  const [botMessages, setBotMessages] = useState(() => {
    if (isAdminMode) return [];
    const saved = sessionStorage.getItem('chat_botMessages');
    return saved ? JSON.parse(saved) : [
      {
        id: 1,
        text: "Hi! I'm your tattoo design assistant. I can help you with design ideas, placement suggestions, aftercare tips, and more. How can I help you today?",
        sender: 'bot',
        timestamp: new Date(),
      }
    ];
  });

  // Live Chat (Human) Messages State
  const [humanMessages, setHumanMessages] = useState(() => {
    if (isAdminMode) return initialMessages && initialMessages.length > 0 ? initialMessages : [{ id: 'system-1', sender: 'system', text: "Connected to live chat history.", timestamp: new Date() }];
    const saved = sessionStorage.getItem('chat_humanMessages');
    return saved ? JSON.parse(saved) : [
      { id: 'system-1', sender: 'system', text: "Connected to live chat.", timestamp: new Date() }
    ];
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const [recentMessages, setRecentMessages] = useState([]);
  const [profanityStrikes, setProfanityStrikes] = useState(0);

  const profanityList = [
    'fuck', 'shit', 'bitch', 'cunt', 'asshole', 'dick', 'pussy', 'whore', 'slut', 'bastard',
    'putangina', 'gago', 'tarantado', 'tangina', 'bobo', 'puta', 'ulol', 'pakyu', 'pokpok', 'kupal'
  ];

  const containsProfanity = (text) => {
    const lowerText = text.toLowerCase();
    // Use word boundaries for English to avoid false positives
    return profanityList.some(word => new RegExp(`\\b${word}\\b`, 'i').test(lowerText));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Persist state to sessionStorage whenever it changes
  useEffect(() => {
    if (!isAdminMode) {
      sessionStorage.setItem('chat_botMessages', JSON.stringify(botMessages));
      sessionStorage.setItem('chat_humanMessages', JSON.stringify(humanMessages));
      sessionStorage.setItem('chat_isHumanMode', JSON.stringify(isHumanMode));
    }
  }, [botMessages, humanMessages, isHumanMode, isAdminMode]);

  useEffect(() => {
    scrollToBottom();
  }, [botMessages, humanMessages, isOpen, isHumanMode]);

  // Socket.io Setup for Live Chat
  useEffect(() => {
    socket.emit('join_room', activeRoom);

    // If switching to human mode or already in human mode, ensure backend knows about this session
    if (isHumanMode && !isAdminMode) {
      socket.emit('start_support_session', { room: activeRoom, name: userName });
    }

    const receiveMessageHandler = (data) => {
      // For Admins, we don't want to hear messages strictly meant for other rooms 
      if (data.room !== activeRoom) return;

      setHumanMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        sender: data.sender,
        text: data.text,
        timestamp: new Date()
      }]);
    };

    const sessionClosedHandler = () => {
      if (!isAdminMode) {
        setIsHumanMode(false);
        setHumanMessages([{ id: 'system-reset', sender: 'system', text: "Live chat ended by the agent. Returning to AI assistant.", timestamp: new Date() }]);
        sessionStorage.removeItem('chat_isHumanMode');
        sessionStorage.setItem('chat_humanMessages', JSON.stringify([{ id: 'system-reset', sender: 'system', text: "Live chat ended by the agent. Returning to AI assistant.", timestamp: new Date() }]));
      }
    };

    socket.on('receive_message', receiveMessageHandler);
    socket.on('session_closed', sessionClosedHandler);

    // Listen for read receipts
    const messagesReadHandler = (data) => {
      if (data.room !== activeRoom) return;
      // Mark all messages sent by the current user as read
      setHumanMessages(prev => prev.map(msg => {
        if (msg.sender === currentUser && !msg.read) {
          return { ...msg, read: true };
        }
        return msg;
      }));
    };
    socket.on('messages_read', messagesReadHandler);

    return () => {
      socket.off('receive_message', receiveMessageHandler);
      socket.off('session_closed', sessionClosedHandler);
      socket.off('messages_read', messagesReadHandler);
    };
  }, [activeRoom, isHumanMode, isAdminMode, humanMessages.length]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const messageText = inputValue.trim();

    // Spam / Rate Limiting (1.5 seconds)
    const now = Date.now();
    if (now - lastMessageTime < 1500) {
      alert("You are sending messages too fast. Please wait a moment.");
      return;
    }

    // Duplicate message prevention (same message 3 times in a row)
    const updatedRecent = [...recentMessages, messageText].slice(-3);
    if (updatedRecent.length === 3 && updatedRecent.every(m => m === messageText)) {
      alert("You've sent the same message multiple times. Please vary your messages.");
      return;
    }
    setRecentMessages(updatedRecent);

    // Profanity Filter with escalation
    if (containsProfanity(messageText)) {
      const newStrikes = profanityStrikes + 1;
      setProfanityStrikes(newStrikes);

      if (newStrikes >= 3) {
        // Report to admin for possible ban
        const customerRoomMatch = activeRoom.match(/^customer_(\d+)$/);
        if (customerRoomMatch) {
          const customerId = customerRoomMatch[1];
          try {
            Axios.post(`${API_URL}/api/chat/report-abuse`, {
              customerId,
              userName,
              strikes: newStrikes
            }).catch(() => {});
          } catch (e) { /* silent */ }
        }
        alert(`You have been flagged for repeated use of inappropriate language (${newStrikes} violations). An admin has been notified and may take action on your account.`);
      } else {
        alert(`Your message contains inappropriate language and cannot be sent. Warning ${newStrikes}/3 — repeated violations will be reported to studio management.`);
      }
      return;
    }

    setLastMessageTime(now);
    setInputValue('');

    if (isHumanMode) {
      // Send to Live Chat
      const messageData = {
        room: activeRoom,
        sender: currentUser,
        text: messageText,
      };
      socket.emit('send_message', messageData);
      setHumanMessages(prev => [...prev, {
        id: Date.now(),
        sender: currentUser,
        text: messageText,
        timestamp: new Date(),
        read: false
      }]);
    } else {
      // Send to AI Bot
      const userMessage = {
        id: Date.now(),
        text: messageText,
        sender: 'user',
        timestamp: new Date(),
      };
      setBotMessages(prev => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await fetch(`${API_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: messageText })
        });
        const data = await response.json();

        const botReply = {
          id: Date.now() + 1,
          text: data.success ? data.response : 'Sorry, I encountered an error.',
          sender: 'bot',
          timestamp: new Date(),
        };
        setBotMessages(prev => [...prev, botReply]);
      } catch (error) {
        setBotMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: 'I seem to be offline. Please try again later.',
          sender: 'bot',
          timestamp: new Date(),
        }]);
      }
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    "What style suits me?",
    "Where should I place it?",
    "How to care for new tattoos?",
    "Does it hurt?",
  ];

  const activeMessages = isHumanMode ? humanMessages : botMessages;

  // Emit mark_read when the chat is visible and there are unread messages from the other party
  useEffect(() => {
    if (!isHumanMode || !isOpen) return;
    const hasUnread = humanMessages.some(msg => msg.sender !== currentUser && msg.sender !== 'system' && !msg.read);
    if (hasUnread) {
      socket.emit('mark_read', { room: activeRoom, reader: currentUser });
      // Locally mark them as read too
      setHumanMessages(prev => prev.map(msg => {
        if (msg.sender !== currentUser && msg.sender !== 'system' && !msg.read) {
          return { ...msg, read: true };
        }
        return msg;
      }));
    }
  }, [humanMessages, isOpen, isHumanMode, activeRoom, currentUser]);

  return (
    <>
      <div
        className={`chat-widget-container ${isOpen ? 'open' : ''} ${isAdminMode ? 'admin-mode' : ''}`}
      >
        <div className="chat-header">
          <div className="chat-header-info">
            <span className="chat-title">{isAdminMode ? (customerName || 'Customer') : (isHumanMode ? 'Live Chat Support' : 'Tattoo AI Assistant')}</span>
            <span className="chat-subtitle">{isHumanMode ? 'Talking to an artist' : 'Always here to help'}</span>
          </div>
          <div className="chat-header-actions">
            {isHumanMode && (
              <button
                className="end-session-btn"
                onClick={() => socket.emit('end_support_session', activeRoom)}
                title="End Live Chat"
              >
                <LogOut size={16} />
              </button>
            )}
            {!isAdminMode && (
              <div className="chat-mode-switcher">
                {/* AI Chatbot button */}
                <button
                  className={`chat-mode-btn ${!isHumanMode ? 'active' : ''}`}
                  onClick={() => { if (isHumanMode) setIsHumanMode(false); }}
                  title={isHumanMode ? 'Switch to AI Chatbot' : 'Currently using AI Chatbot'}
                >
                  <Bot size={16} />
                  <span className="chat-mode-label">Chatbot</span>
                </button>
                {/* Live Agent button */}
                <button
                  className={`chat-mode-btn ${isHumanMode ? 'active' : ''}`}
                  onClick={() => {
                    if (!isHumanMode && !isShopOpen) return;
                    if (!isHumanMode) setIsHumanMode(true);
                  }}
                  title={!isShopOpen ? 'Live agents are currently offline (Hours: 1 PM - 8 PM)' : isHumanMode ? 'Currently chatting with an agent' : 'Switch to Live Agent'}
                >
                  <User size={16} />
                  <span className="chat-mode-label">Live Agent</span>
                </button>
              </div>
            )}
            {!isAdminMode && (
              <button 
                className="chat-close-btn mobile-only-close" 
                onClick={() => setIsOpen(false)}
                title="Close chat"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        <div className="chat-messages">
          {activeMessages.map((msg) => {
            // system messages in live chat
            if (msg.sender === 'system') {
              return <div key={msg.id} className="system-message">{msg.text}</div>;
            }
            const isUser = msg.sender === 'user' || msg.sender === currentUser;
            return (
              <div key={msg.id} className={`chat-message ${isUser ? 'user' : 'bot'}`}>
                <div className={`message-bubble ${isUser ? 'user-bubble' : 'bot-bubble'}`}>
                  <p>{msg.text}</p>
                  <span className="message-time">
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    {isUser && isHumanMode && (
                      <span className={`read-indicator ${msg.read ? 'read' : ''}`} title={msg.read ? 'Read' : 'Sent'}>
                        {msg.read ? <CheckCheck size={14} /> : <Check size={14} />}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && !isHumanMode && (
            <div className="chat-message bot">
              <div className="message-bubble typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />

          {!isHumanMode && (
            <div className="quick-questions">
              <p>Quick questions:</p>
              <div className="quick-buttons">
                {quickQuestions.map((q, i) => (
                  <button key={i} className="quick-btn" onClick={() => { setInputValue(q); }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <form className="chat-input-area" onSubmit={handleSend}>
          <input
            type="text"
            placeholder={isHumanMode ? "Type a message to an artist..." : "Ask me anything..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.slice(0, 500))}
            disabled={isLoading && !isHumanMode}
            className="chat-input"
            maxLength={500}
          />
          <button type="submit" className="send-btn" disabled={isLoading && !isHumanMode}>
            <Send size={18} color="white" />
          </button>
        </form>
      </div>

      {!isAdminMode && (
        <button className="chat-fab" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24} color="white" /> : <MessageSquare size={24} color="white" />}
        </button>
      )}
    </>
  );
}