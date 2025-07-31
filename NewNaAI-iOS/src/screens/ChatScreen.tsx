import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { GiftedChat, IMessage, Send } from 'react-native-gifted-chat';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { chatService } from '../services/chatService';
import MessageBubble from '../components/MessageBubble';
import ModelSelector from '../components/ModelSelector';

export default function ChatScreen() {
  const navigation = useNavigation();
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState('mixtral');
  const [user, setUser] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    loadUserAndSession();
  }, []);

  const loadUserAndSession = async () => {
    try {
      const userStr = await SecureStore.getItemAsync('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        
        // Load or create session
        const session = await chatService.getCurrentSession();
        if (session) {
          setSessionId(session.id);
          loadMessages(session.id);
        }
      }
    } catch (error) {
      console.error('Error loading user/session:', error);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const history = await chatService.getSessionMessages(sessionId);
      const formattedMessages = history.map((msg: any) => ({
        _id: msg.id,
        text: msg.content,
        createdAt: new Date(msg.created_at),
        user: {
          _id: msg.role === 'user' ? 1 : 2,
          name: msg.role === 'user' ? 'You' : 'AI',
        },
      }));
      setMessages(formattedMessages.reverse());
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    if (newMessages.length === 0) return;

    const userMessage = newMessages[0];
    setMessages(previousMessages => GiftedChat.append(previousMessages, newMessages));
    setIsTyping(true);

    try {
      const response = await chatService.sendMessage(
        userMessage.text,
        selectedModel,
        sessionId
      );

      const aiMessage: IMessage = {
        _id: Math.random().toString(),
        text: response.content,
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'AI',
        },
      };

      setMessages(previousMessages => GiftedChat.append(previousMessages, [aiMessage]));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send message');
    } finally {
      setIsTyping(false);
    }
  }, [selectedModel, sessionId]);

  const renderSend = (props: any) => {
    return (
      <Send {...props}>
        <View style={styles.sendButton}>
          <Ionicons name="send" size={24} color="#2563eb" />
        </View>
      </Send>
    );
  };

  const renderMessageBubble = (props: any) => {
    return <MessageBubble {...props} />;
  };

  const handleSettings = () => {
    navigation.navigate('Settings' as never);
  };

  const handleNewChat = async () => {
    Alert.alert(
      'New Chat',
      'Start a new conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'New Chat',
          onPress: async () => {
            try {
              const session = await chatService.createSession();
              setSessionId(session.id);
              setMessages([]);
            } catch (error) {
              Alert.alert('Error', 'Failed to create new chat');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleNewChat} style={styles.headerButton}>
          <Ionicons name="add-circle-outline" size={28} color="#fff" />
        </TouchableOpacity>
        
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
        
        <TouchableOpacity onPress={handleSettings} style={styles.headerButton}>
          <Ionicons name="settings-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <GiftedChat
        messages={messages}
        onSend={onSend}
        user={{
          _id: 1,
          name: 'You',
        }}
        renderBubble={renderMessageBubble}
        renderSend={renderSend}
        isTyping={isTyping}
        placeholder="Type a message..."
        textInputStyle={styles.textInput}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        )}
        messagesContainerStyle={styles.messagesContainer}
        keyboardShouldPersistTaps="handled"
        alwaysShowSend
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerButton: {
    padding: 5,
  },
  textInput: {
    color: '#fff',
    fontSize: 16,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    marginHorizontal: 10,
  },
  sendButton: {
    marginRight: 10,
    marginBottom: 5,
    padding: 5,
  },
  messagesContainer: {
    backgroundColor: '#0d0d0d',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});