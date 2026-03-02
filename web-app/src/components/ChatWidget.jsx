import React, { useState, useRef, useEffect } from 'react';
import './ChatWidget.css';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHumanMode, setIsHumanMode] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm your tattoo design assistant. I can help you with design ideas, placement suggestions, aftercare tips, and more. How can I help you today?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInputValue('');

    if (!isHumanMode) {
      setTimeout(() => {
        const botResponse = getBotResponse(inputValue);
        const botMessage = {
          id: messages.length + 2,
          text: botResponse,
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
      }, 1000);
    } else {
      // Simulate sending to a human / waiting for response
      setTimeout(() => {
        const supportMessage = {
          id: messages.length + 2,
          text: "Message sent to our artists. We'll get back to you shortly via email.",
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, supportMessage]);
      }, 1500);
    }
  };

  const getBotResponse = (input) => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('style') || lowerInput.includes('design')) {
      return "I'd love to help you explore tattoo styles! Popular options include Traditional, Minimalist, Watercolor, Geometric, and Japanese. What kind of aesthetic appeals to you?";
    }
    if (lowerInput.includes('pain') || lowerInput.includes('hurt')) {
      return "Pain levels vary by placement. Areas with more fat and muscle (outer arms, thighs) are less painful, while bony areas (ribs, ankles, spine) tend to be more sensitive.";
    }
    if (lowerInput.includes('aftercare') || lowerInput.includes('care')) {
      return "Proper aftercare is crucial! Keep it clean and moisturized, avoid sun exposure, don't scratch, and follow your artist's specific instructions. Healing typically takes 2-4 weeks.";
    }
    if (lowerInput.includes('price') || lowerInput.includes('cost')) {
      return "Tattoo pricing varies by size, complexity, artist experience, and location. Small simple tattoos might start around ₱50-100, while larger pieces can range from ₱200-1000+.";
    }
    
    return "That's an interesting question! I'm here to help with tattoo-related questions about designs, styles, placement, aftercare, and the tattooing process. Could you tell me more?";
  };

  const quickQuestions = [
    "What style suits me?",
    "Where should I place it?",
    "How to care for new tattoos?",
    "Does it hurt?",
  ];

  return (
    <div className="chat-widget-container">
      {!isOpen && (
        <button className="chat-fab" onClick={() => setIsOpen(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      )}

      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-info">
              <span className="chat-title">Tattoo AI Assistant</span>
              <span className="chat-subtitle">{isHumanMode ? 'Talking to Human' : 'Always here to help'}</span>
            </div>
            <div className="chat-header-actions">
                <button 
                    className={`human-toggle-btn ${isHumanMode ? 'active' : ''}`}
                    onClick={() => setIsHumanMode(!isHumanMode)}
                    title={isHumanMode ? "Switch to AI" : "Talk to a person"}
                >
                    {isHumanMode ? '🤖' : '👤'}
                </button>
                <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
            </div>
          </div>

          <div className="chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message-wrapper ${message.sender === 'user' ? 'user' : 'bot'}`}
              >
                <div className="message-bubble">
                  <p>{message.text}</p>
                  <span className="message-time">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
            
            {messages.length === 1 && !isHumanMode && (
                <div className="quick-questions">
                <p>Quick questions:</p>
                <div className="quick-buttons">
                    {quickQuestions.map((q, i) => (
                    <button key={i} onClick={() => setInputValue(q)}>{q}</button>
                    ))}
                </div>
                </div>
            )}
          </div>

          <div className="chat-input-area">
            <input
              type="text"
              placeholder={isHumanMode ? "Type a message to an artist..." : "Ask me anything..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="send-btn" onClick={handleSend}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}