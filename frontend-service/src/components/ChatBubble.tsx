import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, StyleSheet } from 'react-native';
import { financeApi } from '../services/financeApi';

export const ChatBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{sender: string, text: string}[]>([]);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    
    setMessages(prev => [...prev, { sender: 'user', text: message }]);
    
    // Commands implementation based on endpoints provided
    try {
      if (message.startsWith('/history')) {
        const res = await financeApi.getChatHistory();
        setMessages(prev => [...prev, { sender: 'bot', text: JSON.stringify(res, null, 2) }]);
      } else if (message.startsWith('/session ')) {
        const id = message.split(' ')[1];
        const res = await financeApi.getChatSessionDetail(id);
        setMessages(prev => [...prev, { sender: 'bot', text: JSON.stringify(res, null, 2) }]);
      } else if (message.startsWith('/anomalies')) {
        const res = await financeApi.getAnomalies();
        setMessages(prev => [...prev, { sender: 'bot', text: JSON.stringify(res, null, 2) }]);
      } else if (message.startsWith('/anomaly ')) {
        const id = message.split(' ')[1];
        const res = await financeApi.getAnomalyDetail(id);
        setMessages(prev => [...prev, { sender: 'bot', text: JSON.stringify(res, null, 2) }]);
      } else if (message.startsWith('/recheck ')) {
        const id = message.split(' ')[1];
        const res = await financeApi.recheckAnomaly(id);
        setMessages(prev => [...prev, { sender: 'bot', text: JSON.stringify(res, null, 2) }]);
      } else if (message.startsWith('/insights')) {
        const res = await financeApi.getInsights();
        setMessages(prev => [...prev, { sender: 'bot', text: JSON.stringify(res, null, 2) }]);
      } else {
        const res = await financeApi.askChatbot(message);
        setMessages(prev => [...prev, { sender: 'bot', text: JSON.stringify(res, null, 2) }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { sender: 'bot', text: `Error: ${error.message}` }]);
    } finally {
      setIsSending(false);
    }

    setMessage('');
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.bubble}
        onPress={() => setIsOpen(true)}
      >
        <Text style={styles.bubbleText}>AI</Text>
      </TouchableOpacity>

      <Modal visible={isOpen} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.chatContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>Finance AI</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Text style={styles.close}>X</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.messagesList}>
              {messages.map((m, i) => (
                <View key={i} style={m.sender === 'user' ? styles.userMsg : styles.botMsg}>
                  <Text>{m.text}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.inputContainer}>
              <TextInput 
                style={styles.input}
                value={message}
                onChangeText={setMessage}
                placeholder="Ask me anything..."
                editable={!isSending}
              />
              <TouchableOpacity
                onPress={handleSend}
                style={[styles.sendBtn, isSending && styles.sendBtnDisabled]}
                disabled={isSending}
              >
                <Text>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  bubbleText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  chatContainer: {
    backgroundColor: 'white',
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  close: {
    fontSize: 18,
  },
  messagesList: {
    flex: 1,
    marginBottom: 20,
  },
  userMsg: {
    alignSelf: 'flex-end',
    backgroundColor: '#E5E5EA',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    maxWidth: '80%',
  },
  botMsg: {
    alignSelf: 'flex-start',
    backgroundColor: '#34C759',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    maxWidth: '80%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 20,
    padding: 10,
    marginRight: 10,
  },
  sendBtn: {
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
