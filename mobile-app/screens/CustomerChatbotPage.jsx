/**
 * CustomerChatbotPage.jsx -- AI + Live Support Chat
 * Themed with lucide icons. Preserves dual-mode: AI bot + Socket.IO live agent.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Sparkles, User, Cpu, SendHorizontal } from 'lucide-react-native';
import { colors, typography, borderRadius } from '../src/theme';
import { sendChatMessage, API_URL } from '../src/utils/api';
import io from 'socket.io-client';

const socket = io(API_URL.replace('/api', ''));

export function CustomerChatbotPage({ onBack, userId, userName }) {
  const [isHumanMode, setIsHumanMode] = useState(false);
  const [botMessages, setBotMessages] = useState([
    { id: 1, text: "Hi! I'm your tattoo design assistant. I can help with design ideas, placement, aftercare tips, and more. How can I help?", sender: 'bot', timestamp: new Date() },
  ]);
  const [humanMessages, setHumanMessages] = useState([
    { id: 'sys-1', sender: 'system', text: 'Welcome to Live Support.', timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  const room = useMemo(() => userId ? `customer_${userId}` : `guest_${Math.random().toString(36).substr(2, 9)}`, [userId]);
  const currentUserName = userName || 'Guest User';
  const isShopOpen = useMemo(() => true, []); // Testing: always open

  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, [botMessages, humanMessages, isHumanMode]);

  useEffect(() => {
    socket.emit('join_room', room);
    const onMsg = (data) => {
      if (data.room !== room) return;
      setHumanMessages(prev => [...prev, { id: Date.now() + Math.random(), sender: data.sender, text: data.text, timestamp: new Date() }]);
    };
    const onClose = () => {
      setIsHumanMode(false);
      setHumanMessages(prev => [...prev, { id: 'sys-reset', sender: 'system', text: 'Live chat ended by the agent. Returning to AI assistant.', timestamp: new Date() }]);
    };
    socket.on('receive_message', onMsg);
    socket.on('session_closed', onClose);
    return () => { socket.off('receive_message', onMsg); socket.off('session_closed', onClose); };
  }, [room]);

  const handleSend = () => sendMessage(inputValue);

  const sendMessage = async (text) => {
    if (text.trim().length === 0 || isLoading) return;
    if (inputValue === text) setInputValue('');

    if (isHumanMode) {
      const data = { room, sender: currentUserName, text: text.trim() };
      if (humanMessages.length <= 1) socket.emit('start_support_session', { room, name: currentUserName });
      socket.emit('send_message', data);
      setHumanMessages(prev => [...prev, { id: Date.now(), sender: currentUserName, text: text.trim(), timestamp: new Date() }]);
    } else {
      const userMsg = { id: Date.now().toString(), text: text.trim(), sender: 'user', timestamp: new Date() };
      setBotMessages(prev => [...prev, userMsg]);
      setIsLoading(true);
      const response = await sendChatMessage(text.trim());
      setIsLoading(false);
      setBotMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), sender: 'bot', timestamp: new Date(),
        text: response.success ? response.response : (response.message || 'Sorry, something went wrong.'),
        isError: !response.success,
      }]);
    }
  };

  const toggleMode = () => {
    if (!isHumanMode && !isShopOpen) { Alert.alert('Agents Offline', 'Live support: 1 PM - 8 PM. Use AI Assistant for now.'); return; }
    setIsHumanMode(!isHumanMode);
  };

  const quickQ = ['What style suits me?', 'Where should I place it?', 'How to care for new tattoos?', 'Does it hurt?'];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        {/* Header */}
        <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
              <ArrowLeft size={20} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.headerIcon}>
              <Sparkles size={18} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{isHumanMode ? 'Live Artist Support' : 'Tattoo AI Assistant'}</Text>
              <Text style={styles.headerSub}>{isHumanMode ? 'Chatting with a person' : 'Always here to help'}</Text>
            </View>
            <TouchableOpacity onPress={toggleMode} style={styles.modeToggle}>
              {isHumanMode ? <Cpu size={16} color="#ffffff" /> : <User size={16} color="#ffffff" />}
              <Text style={styles.modeText}>{isHumanMode ? 'AI' : 'Live'}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Messages */}
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.msgContent} showsVerticalScrollIndicator={false}>
          {(isHumanMode ? humanMessages : botMessages).map(msg => (
            <View key={msg.id} style={[styles.msgWrap, (msg.sender === 'user' || msg.sender === currentUserName) ? styles.msgRight : msg.sender === 'system' ? styles.msgCenter : styles.msgLeft]}>
              {msg.sender === 'system' ? (
                <Text style={styles.systemText}>{msg.text}</Text>
              ) : (
                <View style={[styles.bubble, (msg.sender === 'user' || msg.sender === currentUserName) ? styles.bubbleUser : styles.bubbleBot, msg.isError && styles.bubbleError]}>
                  <Text style={[styles.bubbleText, (msg.sender === 'user' || msg.sender === currentUserName) ? { color: '#ffffff' } : { color: colors.textPrimary }]}>{msg.text}</Text>
                  <Text style={[styles.bubbleTime, (msg.sender === 'user' || msg.sender === currentUserName) ? { color: 'rgba(255,255,255,0.6)' } : { color: colors.textTertiary }]}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}
            </View>
          ))}

          {isLoading && (
            <View style={styles.typingRow}><ActivityIndicator size="small" color={colors.textTertiary} /><Text style={styles.typingText}>Assistant is typing...</Text></View>
          )}

          {!isLoading && !isHumanMode && botMessages.length === 1 && (
            <View style={styles.quickWrap}>
              <Text style={styles.quickLabel}>Quick questions:</Text>
              <View style={styles.quickRow}>
                {quickQ.map((q, i) => (
                  <TouchableOpacity key={i} onPress={() => sendMessage(q)} style={styles.quickChip} activeOpacity={0.7}>
                    <Text style={styles.quickChipText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder={isHumanMode ? 'Type a message to an artist...' : 'Ask me anything about tattoos...'}
            placeholderTextColor={colors.textTertiary}
            value={inputValue}
            onChangeText={setInputValue}
            editable={!isLoading || isHumanMode}
            multiline
          />
          <TouchableOpacity onPress={handleSend} disabled={isLoading && !isHumanMode} activeOpacity={0.8}>
            <LinearGradient colors={['#0f172a', colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sendBtn}>
              <SendHorizontal size={18} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, paddingTop: 52, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerTitle: { ...typography.body, fontWeight: '700', color: '#ffffff' },
  headerSub: { ...typography.bodyXSmall, color: 'rgba(255,255,255,0.7)' },
  modeToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.round, gap: 5 },
  modeText: { ...typography.bodyXSmall, color: '#ffffff', fontWeight: '700' },
  msgContent: { padding: 16, paddingBottom: 20 },
  msgWrap: { marginBottom: 14 },
  msgRight: { alignItems: 'flex-end' },
  msgLeft: { alignItems: 'flex-start' },
  msgCenter: { alignItems: 'center' },
  bubble: { maxWidth: '80%', borderRadius: borderRadius.xl, padding: 12 },
  bubbleUser: { backgroundColor: '#0f172a' },
  bubbleBot: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: colors.border },
  bubbleError: { backgroundColor: '#fee2e2', borderColor: colors.error, borderWidth: 1 },
  bubbleText: { ...typography.body, lineHeight: 21, marginBottom: 4 },
  bubbleTime: { ...typography.bodyXSmall },
  systemText: { ...typography.bodyXSmall, color: colors.textTertiary, textAlign: 'center', fontStyle: 'italic' },
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  typingText: { marginLeft: 8, ...typography.body, color: colors.textTertiary },
  quickWrap: { marginTop: 12 },
  quickLabel: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 10 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#ffffff', borderRadius: borderRadius.round, borderWidth: 1, borderColor: colors.border },
  quickChipText: { ...typography.bodySmall, color: colors.textPrimary },
  inputBar: { flexDirection: 'row', padding: 12, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: colors.border, gap: 10, alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 42, maxHeight: 100, borderWidth: 1, borderColor: colors.border, borderRadius: 21, paddingHorizontal: 16, paddingVertical: 10, ...typography.body, color: colors.textPrimary, backgroundColor: '#f8fafc' },
  sendBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
});
