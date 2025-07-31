import React, { createContext, useContext, ReactNode } from 'react';

interface Theme {
  colors: {
    background: string;
    surface: string;
    primary: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
  };
}

const darkTheme: Theme = {
  colors: {
    background: '#0d0d0d',
    surface: '#1a1a1a',
    primary: '#2563eb',
    text: '#ffffff',
    textSecondary: '#999999',
    border: '#333333',
    error: '#ef4444',
    success: '#10b981',
  },
};

interface ThemeContextType {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: darkTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}