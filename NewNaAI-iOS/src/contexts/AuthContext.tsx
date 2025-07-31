import React, { createContext, useState, useContext, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  isGuest?: boolean;
  daily_message_limit?: number;
  daily_message_count?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (user: User, token?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const login = async (user: User, token?: string) => {
    setUser(user);
    setIsGuest(user.isGuest || false);
    
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    
    if (token) {
      await SecureStore.setItemAsync('authToken', token);
    }
    
    if (user.isGuest) {
      await AsyncStorage.setItem('isGuest', 'true');
    }
  };

  const logout = async () => {
    setUser(null);
    setIsGuest(false);
    
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync('authToken');
    await AsyncStorage.removeItem('isGuest');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    isAuthenticated: !!user && !isGuest,
    isGuest,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}