/**
 * AdminChat.jsx -- Live Support Chat
 * Socket.io based real-time chat with session list and message view.
 * Themed upgrade with lucide icons.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { ArrowLeft, Send, MessageSquare, Radio, X as XIcon } from 'lucide-react-native';
import { io } from 'socket.io-client';
import { colors, typography, spacing, borderRadius, shadows } from '../src/theme';
import { EmptyState } from '../src/components/shared/EmptyState';
import { API_BASE_URL, getChatHistory } from '../src/utils/api';

export const AdminChat = ({ navigation }) => {
  const [liveSessions, setLiveSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');

  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const selectedRef = useRef(null);

  useEffect(() => { selectedRef.current = selectedSession; }, [selectedSession]);

  useEffect(() => {
    const baseUrl = (API_BASE_URL || '').replace(/\/api\/?$/, '');
    const socket = io(baseUrl);
    socketRef.current = socket;
    socket.emit('join_admin_tracking');

    socket.on('support_sessions_update', (sessions) => {
      const sorted = [...sessions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setLiveSessions(sorted);
      const sel = selectedRef.current;
      if (sel && !sessions.find(s => s.id === sel.id)) setSelectedSession(null);
    });

    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (selectedSession && socketRef.current) {
      setMessages([]);
      const loadHistory = async () => {
        const res = await getChatHistory(selectedSession.id);
        if (res.success && res.messages) {
          setMessages(res.messages.map(m => ({ sender: m.sender, text: m.text })));
        }
      };
      loadHistory();
      socketRef.current.emit('join_room', selectedSession.id);
      socketRef.current.on('receive_message', (data) => {
        if (data.room === selectedSession.id) {
          setMessages(prev => [...prev, { sender: data.sender, text: data.text }]);
        }
      });
      return () => { socketRef.current.off('receive_message'); };
    }
  }, [selectedSession]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || !selectedSession) return;
    socketRef.current.emit('send_message', { room: selectedSession.id, sender: 'Admin', text });
    setMessages(prev => [...prev, { sender: 'Admin', text }]);
    setInputValue('');
  };

  const handleClose = () => {
    if (!selectedSession || !socketRef.current) return;
    socketRef.current.emit('close_session', { room: selectedSession.id });
    setLiveSessions(prev => prev.filter(s => s.id !== selectedSession.id));
    setSelectedSession(null);
  };

  const renderSession = ({ item }) => (
    <TouchableOpacity
      style={[styles.sessionCard, selectedSession?.id === item.id && styles.sessionCardActive]}
      onPress={() => setSelectedSession(item)}
      activeOpacity={0.7}
    >
      <View style={styles.sessionTop}>
        <Text style={styles.sessionName}>{item.name}</Text>
        <View style={styles.liveBadge}>
          <Radio size={10} color={colors.success} />
          <Text style={styles.liveBadgeText}>Live</Text>
        </View>
      </View>
      <Text style={styles.sessionPreview} numberOfLines={1}>{item.lastMessage}</Text>
      <Text style={styles.sessionTime}>
        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </TouchableOpacity>
  );

  const renderMessage = ({ item }) => {
    const isAdmin = item.sender === 'Admin';
    return (
      <View style={[styles.msgRow, isAdmin ? styles.msgRowRight : styles.msgRowLeft]}>
        <View style={[styles.msgBubble, isAdmin ? styles.msgBubbleAdmin : styles.msgBubbleUser]}>
          <Text style={[styles.msgText, isAdmin && { color: '#ffffff' }]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => {
            if (selectedSession) setSelectedSession(null);
            else navigation?.goBack?.();
          }} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedSession ? selectedSession.name : 'Support Chat'}</Text>
        </View>
        {selectedSession && (
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <XIcon size={14} color="#ffffff" />
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>

      {!selectedSession ? (
        /* Session List */
        liveSessions.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState icon={MessageSquare} title="No active sessions" subtitle="Customer support requests will appear here" />
          </View>
        ) : (
          <FlatList
            data={liveSessions}
            renderItem={renderSession}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
          />
        )
      ) : (
        /* Chat Window */
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(_, i) => i.toString()}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="Type a message..."
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Send size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  closeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.error, paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.md,
  },
  closeBtnText: { ...typography.bodyXSmall, color: '#ffffff', fontWeight: '700' },

  // List
  listContent: { padding: 16 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sessionCard: {
    backgroundColor: '#ffffff', padding: 14, borderRadius: borderRadius.xl,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  sessionCardActive: { borderColor: colors.primary, borderWidth: 2 },
  sessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sessionName: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.successBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.round,
  },
  liveBadgeText: { ...typography.bodyXSmall, color: colors.success, fontWeight: '700' },
  sessionPreview: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 4 },
  sessionTime: { ...typography.bodyXSmall, color: colors.textTertiary, textAlign: 'right' },

  // Chat
  chatContent: { padding: 16, paddingBottom: 8 },
  msgRow: { marginBottom: 8, flexDirection: 'row' },
  msgRowLeft: { justifyContent: 'flex-start' },
  msgRowRight: { justifyContent: 'flex-end' },
  msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  msgBubbleUser: { backgroundColor: colors.lightBgSecondary, borderBottomLeftRadius: 4 },
  msgBubbleAdmin: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  msgText: { ...typography.body, color: colors.textPrimary },

  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: colors.border,
  },
  textInput: {
    flex: 1, backgroundColor: colors.lightBgSecondary, color: colors.textPrimary,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.round,
    ...typography.body,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
});
