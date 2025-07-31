import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/constants';

class ChatService {
  async sendMessage(message: string, model: string, sessionId?: string | null) {
    const isGuest = await AsyncStorage.getItem('isGuest') === 'true';
    const endpoint = isGuest ? '/api/guest/chat' : '/api/chat';
    
    const body: any = {
      message,
      model,
    };

    if (sessionId) {
      body.sessionId = sessionId;
    }

    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (!isGuest) {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send message');
    }

    const data = await response.json();
    
    // Update guest message count
    if (isGuest && data.remainingMessages !== undefined) {
      await AsyncStorage.setItem('guestMessageCount', data.messagesUsed.toString());
    }

    return data;
  }

  async createSession() {
    const token = await SecureStore.getItemAsync('authToken');
    
    const response = await fetch(`${API_BASE_URL}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: `Chat ${new Date().toLocaleDateString()}`,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create session');
    }

    return response.json();
  }

  async getCurrentSession() {
    const token = await SecureStore.getItemAsync('authToken');
    if (!token) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/current`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      return response.json();
    } catch (error) {
      return null;
    }
  }

  async getSessionMessages(sessionId: string) {
    const token = await SecureStore.getItemAsync('authToken');
    
    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/messages`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to load messages');
    }

    return response.json();
  }

  async getAvailableModels() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/models`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  }
}

export const chatService = new ChatService();