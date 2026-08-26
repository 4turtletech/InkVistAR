/**
 * AdminChat.jsx -- Live Support Chat
 * Socket.io based real-time chat with session list and message view.
 * Themed upgrade with lucide icons.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  KeyboardAvoidingView, Platform, SafeAreaView, Alert,
} from 'react-native';
import { ArrowLeft, Send, MessageSquare, Radio, X as XIcon } from 'lucide-react-native';
import { io } from 'socket.io-client';
import { colors, typography, spacing, borderRadius, shadows } from '../src/theme';
import { EmptyState } from '../src/components/shared/EmptyState';
import { API_BASE_URL, getChatHistory, getSocketAuthToken } from '../src/utils/api';

export const AdminChat = ({ navigation }) => {
  const [liveSessions, setLiveSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [endedSessions, setEndedSessions] = useState([]);
  const [connectionError, setConnectionError] = useState('');

  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const selectedRef = useRef(null);
  const prevSessionsRef = useRef([]);

  useEffect(() => { selectedRef.current = selectedSession; }, [selectedSession]);

  useEffect(() => {
    const baseUrl = (API_BASE_URL || '').replace(/\/api\/?$/, '');
    const socket = io(baseUrl, {
      autoConnect: false,
      auth: async (callback) => callback({ token: await getSocketAuthToken() }),
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });
    socketRef.current = socket;
    socket.on('connect', () => {
      setConnectionError('');
      socket.emit('join_admin_tracking');
      if (selectedRef.current?.id) socket.emit('join_room', selectedRef.current.id);
    });
    socket.on('connect_error', () => setConnectionError('Unable to connect to live support. Retrying...'));
    socket.on('authorization_error', () => setConnectionError('Live support authorization failed. Please sign in again.'));

    socket.on('support_sessions_update', (sessions) => {
      const sorted = [...sessions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const prevSessions = prevSessionsRef.current || [];
      const currentIds = new Set(sorted.map(session => session.id));
      const newlyEnded = prevSessions.filter(session => !currentIds.has(session.id));

      if (newlyEnded.length > 0) {
        setEndedSessions(prev => {
          const deduped = [...prev];
          newlyEnded.forEach((endedSession) => {
            if (!deduped.some((existing) => existing.id === endedSession.id)) {
              deduped.push(endedSession);
            }
          });
          return deduped;
        });
      } else if (prevSessions.length === 0 && sessions.length === 0) {
        setEndedSessions([]);
      }

      setEndedSessions(prev => prev.filter(session => !currentIds.has(session.id)));
      prevSessionsRef.current = sorted;
      setLiveSessions(sorted);
      const sel = selectedRef.current;
      if (sel && !sessions.find(s => s.id === sel.id)) setSelectedSession(null);
    });
    socket.connect();

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
      socketRef.current.on('session_closed', () => {
        setSelectedSession(null);
        setMessages([]);
      });
      return () => {
        socketRef.current.off('receive_message');
        socketRef.current.off('session_closed');
      };
    }
  }, [selectedSession]);

  const handleClearEndedSessions = () => {
    setEndedSessions([]);
  };

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || !selectedSession) return;
    if (!socketRef.current?.connected) {
      setConnectionError('Live support is reconnecting. Your message was not sent; please retry.');
      return;
    }
    socketRef.current.emit('send_message', { room: selectedSession.id, sender: 'Admin', text });
    setMessages(prev => [...prev, { sender: 'Admin', text }]);
    setInputValue('');
  };

  const endSelectedChat = () => {
    if (!selectedSession || !socketRef.current) return;
    if (!socketRef.current.connected) {
      Alert.alert('Connection Required', 'Reconnect to the server before ending this chat.');
      return;
    }
    const endedSession = selectedSession;
    socketRef.current.emit('end_support_session', endedSession.id);
    setEndedSessions(prev => (
      prev.some(session => session.id === endedSession.id)
        ? prev
        : [{ ...endedSession, timestamp: new Date() }, ...prev]
    ));
    setLiveSessions(prev => prev.filter(s => s.id !== endedSession.id));
    setMessages([]);
    setSelectedSession(null);
  };

  const handleClose = () => {
    if (!selectedSession) return;
    Alert.alert(
      'End Chat',
      `End the live chat with ${selectedSession.name || 'this customer'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End Chat', style: 'destructive', onPress: endSelectedChat },
      ],
    );
  };

  const renderActiveSession = ({ item }) => (
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

  const renderEndedSession = ({ item }) => (
    <View style={[styles.sessionCard, styles.endedSessionCard]}>
      <View style={styles.sessionTop}>
        <Text style={styles.sessionName}>{item.name}</Text>
        <View style={styles.endedBadge}>
          <Text style={styles.endedBadgeText}>Ended</Text>
        </View>
      </View>
      <Text style={styles.sessionPreview} numberOfLines={1}>{item.lastMessage || 'Session ended.'}</Text>
      <Text style={styles.sessionTime}>
        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  const renderMessage = ({ item }) => {
    const isAdmin = item.sender === 'Admin' || item.sender === 'Studio Support';
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
            <Text style={styles.closeBtnText}>End Chat</Text>
          </TouchableOpacity>
        )}
        {!selectedSession && endedSessions.length > 0 && (
          <TouchableOpacity style={styles.clearEndedBtn} onPress={handleClearEndedSessions}>
            <Text style={styles.clearEndedText}>Clear Ended</Text>
          </TouchableOpacity>
        )}
      </View>

      {connectionError ? <Text style={styles.connectionError}>{connectionError}</Text> : null}

      {!selectedSession ? (
        <>
          {liveSessions.length > 0 && (
            <FlatList
              data={liveSessions}
              renderItem={renderActiveSession}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
            />
          )}
          {endedSessions.length === 0 && liveSessions.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState icon={MessageSquare} title="No active sessions" subtitle="Customer support requests will appear here" />
            </View>
          ) : null}
          {endedSessions.length > 0 && (
            <View style={styles.endedSection}>
              <View style={styles.endedSectionHeaderRow}>
                <Text style={styles.endedSectionTitle}>Past / Ended Chats</Text>
                <TouchableOpacity style={styles.clearAllEndedBtn} onPress={handleClearEndedSessions}>
                  <Text style={styles.clearAllEndedText}>Clear</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={endedSessions}
                renderItem={renderEndedSession}
                keyExtractor={item => `ended-${item.id}`}
                contentContainerStyle={styles.listContent}
                scrollEnabled={false}
              />
            </View>
          )}
        </>
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
  clearEndedBtn: {
    marginLeft: 8,
    backgroundColor: colors.textTertiary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.md,
  },
  clearEndedText: { ...typography.bodyXSmall, color: '#ffffff', fontWeight: '700' },
  connectionError: { ...typography.bodySmall, color: colors.error, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fef2f2' },

  // List
  listContent: { padding: 16 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sessionCard: {
    backgroundColor: '#ffffff', padding: 14, borderRadius: borderRadius.xl,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  sessionCardActive: { borderColor: colors.primary, borderWidth: 2 },
  endedSessionCard: { opacity: 0.78, borderColor: colors.borderLight, borderStyle: 'dashed' },
  sessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sessionName: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.successBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.round,
  },
  liveBadgeText: { ...typography.bodyXSmall, color: colors.success, fontWeight: '700' },
  endedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.borderLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.round,
  },
  endedBadgeText: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '700' },
  sessionPreview: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 4 },
  sessionTime: { ...typography.bodyXSmall, color: colors.textTertiary, textAlign: 'right' },
  endedSection: { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingBottom: 20 },
  endedSectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginTop: 4, marginBottom: 2,
  },
  endedSectionTitle: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '700' },
  clearAllEndedBtn: {
    backgroundColor: colors.textTertiary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.round,
  },
  clearAllEndedText: { ...typography.bodyXSmall, color: '#ffffff', fontWeight: '700' },

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
