// components/Mobile/SimpleChatbot.jsx
import { useState, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { sendChatMessage } from '../../src/utils/api';

export function SimpleChatbot({ onBack }) {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: "Hi! I'm your tattoo AI assistant. How can I help you today?",
      sender: 'bot',
      time: 'Just now',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async (messageText) => {
    if (messageText.trim().length === 0 || isLoading) {
      return;
    }

    // Add user message to the chat immediately for better UX
    const userMessage = {
      id: Date.now().toString(),
      text: messageText.trim(),
      sender: 'user',
      time: 'Just now',
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // If the message came from the input field, clear it
    if (inputValue === messageText) {
      setInputValue('');
    }

    const response = await sendChatMessage(messageText.trim());
    setIsLoading(false);

    const botResponse = {
      id: (Date.now() + 1).toString(),
      sender: 'bot',
      time: 'Just now',
    };

    if (response.success) {
      botResponse.text = response.response;
    } else {
      botResponse.text = response.message || 'Sorry, something went wrong.';
      botResponse.isError = true;
    }
    setMessages(prev => [...prev, botResponse]);
  };

  const handleSend = () => sendMessage(inputValue);

  const quickQuestions = [
    "How much does a tattoo cost?",
    "How do I book an appointment?",
    "What are some aftercare tips?",
    "What styles do you have?",
  ];

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        style={styles.keyboardView}
      >
        {/* Header */}
        <LinearGradient
          colors={['#000000', '#b8860b']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Tattoo Assistant</Text>
              <Text style={styles.headerSubtitle}>Online</Text>
            </View>
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={16} color="#ffffff" />
            </View>
          </View>
        </LinearGradient>

        {/* Chat Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageWrapper,
                message.sender === 'user' ? styles.messageWrapperUser : styles.messageWrapperBot
              ]}
            >
              <View style={[
                styles.messageBubble,
                message.sender === 'user' ? styles.messageBubbleUser : styles.messageBubbleBot,
                message.isError && styles.messageBubbleError
              ]}>
                <Text style={[
                  styles.messageText,
                  message.sender === 'user' ? styles.messageTextUser : styles.messageTextBot
                ]}>
                  {message.text}
                </Text>
                <Text style={[
                  styles.messageTime,
                  message.sender === 'user' ? styles.messageTimeUser : styles.messageTimeBot
                ]}>{message.time}</Text>
              </View>
            </View>
          ))}

          {isLoading && (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color="#6b7280" />
              <Text style={styles.typingText}>Assistant is typing...</Text>
            </View>
          )}

          {/* Quick Questions */}
          <View style={styles.quickQuestions}>
            <Text style={styles.quickQuestionsTitle}>Quick questions:</Text>
            <View style={styles.quickQuestionsGrid}>
              {quickQuestions.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickQuestion}
                  onPress={() => sendMessage(question)}
                >
                  <Text style={styles.quickQuestionText}>{question}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your question..."
            placeholderTextColor="#9ca3af"
            value={inputValue}
            onChangeText={setInputValue}
            editable={!isLoading}
            multiline
          />
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleSend}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#000000', '#daa520']}
              style={styles.sendButtonGradient}
            >
              <Ionicons name="send" size={20} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
  },
  aiBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  messageWrapperUser: {
    alignItems: 'flex-end',
  },
  messageWrapperBot: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    paddingBottom: 8,
  },
  messageBubbleUser: {
    backgroundColor: '#000000',
  },
  messageBubbleBot: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageBubbleError: {
    backgroundColor: '#FFDDDD',
    borderColor: '#D9534F',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTextUser: {
    color: '#ffffff',
  },
  messageTextBot: {
    color: '#111827',
  },
  messageTime: {
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  messageTimeUser: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeBot: {
    color: '#6b7280',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  quickQuestions: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  quickQuestionsTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  quickQuestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickQuestion: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickQuestionText: {
    fontSize: 14,
    color: '#374151',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
    gap: 12,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  sendButton: {
    marginBottom: 8,
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});