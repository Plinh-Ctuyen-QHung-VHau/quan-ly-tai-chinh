import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { financeApi } from '../services/financeApi';

const SCREEN = Dimensions.get('window');
const BUBBLE_SIZE = 58;

const SUGGESTIONS = [
  { text: 'Tháng này tôi đã chi bao nhiêu?' },
  { text: 'Tôi có chi tiêu bất thường gần đây không?' },
  { text: 'So sánh chi tiêu tháng này với tháng trước' },
  { text: 'Thu nhập tháng này của tôi là bao nhiêu?' },
];

type ChatMessage = { id: string; sender: 'user' | 'bot'; text: string };

function mapSessionMessage(m: any): ChatMessage {
  return {
    id: m.id ?? String(Math.random()),
    sender: m.sender_type === 'assistant' ? 'bot' : 'user',
    text: m.content,
  };
}

export const ChatBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Reset về welcome mỗi khi mở modal
  useEffect(() => {
    if (isOpen) {
      setShowWelcome(true);
      setMessages([]);
    }
  }, [isOpen]);

  const pan = useRef(new Animated.ValueXY({
    x: SCREEN.width - BUBBLE_SIZE - 20,
    y: SCREEN.height - BUBBLE_SIZE - 90,
  })).current;
  const panOffset = useRef({ x: SCREEN.width - BUBBLE_SIZE - 20, y: SCREEN.height - BUBBLE_SIZE - 90 });

  useEffect(() => {
    pan.addListener((value) => { panOffset.current = value; });
    return () => pan.removeAllListeners();
  }, [pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4,
      onPanResponderGrant: () => {
        pan.setOffset({ x: panOffset.current.x, y: panOffset.current.y });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gs) => {
        pan.flattenOffset();
        const newX = Math.max(10, Math.min(SCREEN.width - BUBBLE_SIZE - 10, panOffset.current.x));
        const newY = Math.max(60, Math.min(SCREEN.height - BUBBLE_SIZE - 90, panOffset.current.y));
        Animated.spring(pan, { toValue: { x: newX, y: newY }, useNativeDriver: false }).start();
        if (Math.abs(gs.dx) < 5 && Math.abs(gs.dy) < 5) setIsOpen(true);
      },
    }),
  ).current;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendText = async (text: string) => {
    if (!text || isSending) return;
    setShowWelcome(false);
    setIsSending(true);
    setMessages(prev => [...prev, { id: Date.now() + 'u', sender: 'user', text }]);
    try {
      const res = await financeApi.askChatbot(text);
      const reply = res?.reply || 'Tôi chưa có câu trả lời phù hợp.';
      setMessages(prev => [...prev, { id: Date.now() + 'b', sender: 'bot', text: reply }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { id: Date.now() + 'e', sender: 'bot', text: `Lỗi: ${error.message}` }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = () => {
    const text = message.trim();
    if (!text) return;
    setMessage('');
    sendText(text);
  };

  const handleLoadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await financeApi.getChatHistory();
      const sessions = res?.data || res;
      if (Array.isArray(sessions) && sessions.length > 0) {
        const detailRes = await financeApi.getChatSessionDetail(sessions[0].id);
        const history: ChatMessage[] = (detailRes?.data || detailRes || []).map(mapSessionMessage);
        setMessages(history);
        setShowWelcome(false);
      }
    } catch { } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <>
      <Animated.View
        style={[styles.bubble, { transform: pan.getTranslateTransform() }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.bubbleInner}>
          <Text style={styles.bubbleIcon}>💬</Text>
        </View>
      </Animated.View>

      <Modal visible={isOpen} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
            <View style={styles.sheet}>
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarIcon}>💬</Text>
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>Trợ lý tài chính AI</Text>
                    <Text style={styles.headerSub}>Luôn sẵn sàng hỗ trợ bạn</Text>
                  </View>
                </View>
                <Pressable onPress={() => setIsOpen(false)} style={styles.closeBtn} hitSlop={10}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </Pressable>
              </View>

              {/* Messages / Welcome */}
              <ScrollView
                ref={scrollRef}
                style={styles.messages}
                contentContainerStyle={styles.messagesContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={historyLoading}
                    onRefresh={handleLoadHistory}
                    tintColor="#2563EB"
                    title="Đang tải lịch sử..."
                    titleColor="#64748B"
                  />
                }
              >
                {showWelcome ? (
                  <View style={styles.welcomeWrap}>
                    {/* Bot greeting */}
                    <View style={styles.rowBot}>
                      <View style={styles.botAvatar}>
                        <Text style={styles.botAvatarIcon}>💬</Text>
                      </View>
                      <View style={[styles.bubble2, styles.bubbleBot]}>
                        <Text style={styles.textBot}>Xin chào! Tôi là trợ lý tài chính của bạn. Tôi có thể giúp bạn theo dõi chi tiêu, phân tích tài chính và trả lời các câu hỏi về ngân sách 😊</Text>
                      </View>
                    </View>

                    {/* Suggestion cards */}
                    <View style={styles.suggestBox}>
                      <Text style={styles.suggestTitle}>❓ Bạn muốn hỏi về:</Text>
                      {SUGGESTIONS.map((s, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[styles.suggestItem, i > 0 && styles.suggestItemBorder]}
                          onPress={() => sendText(s.text)}
                          activeOpacity={0.65}
                        >
                          <Text style={styles.suggestText}>{s.icon}  {s.text}</Text>
                          <Text style={styles.suggestArrow}>›</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                  </View>
                ) : (
                  <>

                    {messages.map((m) => (
                      <View key={m.id} style={m.sender === 'user' ? styles.rowUser : styles.rowBot}>
                        {m.sender === 'bot' && (
                          <View style={styles.botAvatar}>
                            <Text style={styles.botAvatarIcon}>💬</Text>
                          </View>
                        )}
                        <View style={[styles.bubble2, m.sender === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                          <Text style={m.sender === 'user' ? styles.textUser : styles.textBot}>{m.text}</Text>
                        </View>
                      </View>
                    ))}
                    {isSending && (
                      <View style={styles.rowBot}>
                        <View style={styles.botAvatar}>
                          <Text style={styles.botAvatarIcon}>💬</Text>
                        </View>
                        <View style={[styles.bubble2, styles.bubbleBot]}>
                          <Text style={styles.textBot}>Đang trả lời...</Text>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>

              {/* Quick suggestion chips — luôn hiện phía trên input */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipBar}
                contentContainerStyle={styles.chipBarContent}
                keyboardShouldPersistTaps="handled"
              >
                {SUGGESTIONS.map((s, i) => (
                  <TouchableOpacity key={i} style={styles.chip} onPress={() => sendText(s.text)} activeOpacity={0.7}>
                    <Text style={styles.chipText}>{s.text}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Input bar */}
              <View style={styles.inputBar}>
                <TextInput
                  style={styles.input}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Nhập câu hỏi..."
                  placeholderTextColor="#94A3B8"
                  editable={!isSending}
                  multiline
                  maxLength={500}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                />
                <Pressable
                  onPress={handleSend}
                  disabled={isSending || !message.trim()}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    (isSending || !message.trim()) && styles.sendBtnDisabled,
                    pressed && styles.sendBtnPressed,
                  ]}
                >
                  <Text style={styles.sendBtnText}>➤</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bubble: { position: 'absolute', width: BUBBLE_SIZE, height: BUBBLE_SIZE, zIndex: 9999 },
  bubbleInner: {
    width: BUBBLE_SIZE, height: BUBBLE_SIZE, borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 10,
  },
  bubbleIcon: { fontSize: 26, color: '#FFFFFF', lineHeight: 30 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    maxHeight: SCREEN.height * 0.85, minHeight: SCREEN.height * 0.60,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 20,
  },
  handleBar: {
    width: 44, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1',
    alignSelf: 'center', marginTop: 10, marginBottom: 0,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#DBEAFE',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarIcon: { fontSize: 22, color: '#2563EB', lineHeight: 26 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  headerSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { fontSize: 14, color: '#64748B', fontWeight: '700' },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 10 },

  // Welcome
  welcomeWrap: { gap: 16 },
  suggestBox: {
    backgroundColor: '#F8FAFC', borderRadius: 16,
    borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden',
  },
  suggestTitle: {
    fontSize: 14, fontWeight: '700', color: '#0F172A',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  suggestItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13, backgroundColor: '#FFFFFF',
  },
  suggestItemBorder: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  suggestText: { fontSize: 14, color: '#1E40AF', flex: 1 },
  suggestArrow: { fontSize: 20, color: '#94A3B8', marginLeft: 8 },
  historyBtn: {
    alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  historyBtnText: { fontSize: 13, color: '#64748B' },

  // History button top of chat
  historyBtnTop: {
    alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 16,
    borderRadius: 14, backgroundColor: '#F1F5F9', marginBottom: 8,
  },
  historyBtnTopText: { fontSize: 12, color: '#64748B' },

  // Messages
  rowUser: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  rowBot: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  botAvatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#DBEAFE',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  botAvatarIcon: { fontSize: 13, color: '#2563EB', lineHeight: 16 },
  bubble2: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleUser: { backgroundColor: '#2563EB', borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: '#F1F5F9', borderBottomLeftRadius: 4 },
  textUser: { color: '#FFFFFF', fontSize: 15, lineHeight: 22 },
  textBot: { color: '#0F172A', fontSize: 15, lineHeight: 22 },

  // Chip bar
  chipBar: {
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    maxHeight: 48,
  },
  chipBarContent: {
    paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF', flexShrink: 0,
  },
  chipText: { fontSize: 12, color: '#1E40AF' },

  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
    gap: 10,
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120,
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: '#0F172A', backgroundColor: '#F8FAFC',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563EB',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  sendBtnDisabled: { backgroundColor: '#CBD5E1' },
  sendBtnPressed: { opacity: 0.8 },
  sendBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
});
