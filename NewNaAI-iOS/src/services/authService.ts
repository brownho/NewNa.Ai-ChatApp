import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/constants';

class AuthService {
  async authenticate(email: string, password: string, isLogin: boolean) {
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Authentication failed');
    }

    const data = await response.json();
    return data;
  }

  async guestLogin() {
    const guestUser = {
      id: 'guest',
      email: 'guest@local',
      isGuest: true,
      daily_message_limit: 10,
      daily_message_count: 0,
    };

    await AsyncStorage.setItem('isGuest', 'true');
    return { user: guestUser };
  }

  async logout() {
    try {
      await AsyncStorage.multiRemove(['authToken', 'user', 'isGuest']);
      
      // Call logout endpoint if authenticated user
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async validateSession() {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export const authService = new AuthService();