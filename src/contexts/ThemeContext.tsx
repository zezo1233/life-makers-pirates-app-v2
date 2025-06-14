import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Background colors
  background: string;
  surface: string;
  card: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Border and divider colors
  border: string;
  divider: string;
  
  // Shadow colors
  shadow: string;
  
  // Special colors
  overlay: string;
  disabled: string;
  placeholder: string;
}

export interface Theme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
}

const lightTheme: Theme = {
  mode: 'light',
  colors: {
    // Background colors
    background: '#f8f9fa',
    surface: '#ffffff',
    card: '#ffffff',
    
    // Text colors
    text: '#333333',
    textSecondary: '#666666',
    textMuted: '#999999',
    
    // Primary colors
    primary: '#667eea',
    primaryLight: '#8fa4f3',
    primaryDark: '#4c63d2',
    
    // Status colors
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
    info: '#17a2b8',
    
    // Border and divider colors
    border: '#e9ecef',
    divider: '#f0f0f0',
    
    // Shadow colors
    shadow: '#000000',
    
    // Special colors
    overlay: 'rgba(0, 0, 0, 0.5)',
    disabled: '#cccccc',
    placeholder: '#aaaaaa',
  },
};

const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    // Background colors
    background: '#121212',
    surface: '#1e1e1e',
    card: '#2d2d2d',
    
    // Text colors
    text: '#ffffff',
    textSecondary: '#cccccc',
    textMuted: '#888888',
    
    // Primary colors
    primary: '#8fa4f3',
    primaryLight: '#b3c6f6',
    primaryDark: '#6b82f0',
    
    // Status colors
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3',
    
    // Border and divider colors
    border: '#404040',
    divider: '#333333',
    
    // Shadow colors
    shadow: '#000000',
    
    // Special colors
    overlay: 'rgba(0, 0, 0, 0.7)',
    disabled: '#555555',
    placeholder: '#777777',
  },
};

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = '@theme_mode';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Load saved theme mode on app start
  useEffect(() => {
    loadThemeMode();
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  const loadThemeMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
        setThemeModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load theme mode:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Failed to save theme mode:', error);
    }
  };

  const toggleTheme = () => {
    const currentIsDark = getCurrentTheme().mode === 'dark';
    setThemeMode(currentIsDark ? 'light' : 'dark');
  };

  const getCurrentTheme = (): Theme => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themeMode === 'dark' ? darkTheme : lightTheme;
  };

  const theme = getCurrentTheme();
  const isDark = theme.mode === 'dark';

  const value: ThemeContextType = {
    theme,
    themeMode,
    setThemeMode,
    isDark,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Helper function to create themed styles
export const createThemedStyles = <T extends Record<string, any>>(
  styleCreator: (theme: Theme) => T
) => {
  return (theme: Theme): T => styleCreator(theme);
};

// Common themed style patterns
export const getThemedTextStyle = (theme: Theme, variant: 'primary' | 'secondary' | 'muted' = 'primary') => {
  const colors = {
    primary: theme.colors.text,
    secondary: theme.colors.textSecondary,
    muted: theme.colors.textMuted,
  };

  return {
    color: colors[variant],
  };
};

export const getThemedBackgroundStyle = (theme: Theme, variant: 'background' | 'surface' | 'card' = 'background') => {
  const colors = {
    background: theme.colors.background,
    surface: theme.colors.surface,
    card: theme.colors.card,
  };

  return {
    backgroundColor: colors[variant],
  };
};

export const getThemedBorderStyle = (theme: Theme) => {
  return {
    borderColor: theme.colors.border,
  };
};

export const getThemedShadowStyle = (theme: Theme) => {
  if (theme.mode === 'dark') {
    // Reduced shadow for dark mode
    return {
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    };
  }

  return {
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  };
};

// Status bar style helper
export const getStatusBarStyle = (theme: Theme): 'light-content' | 'dark-content' => {
  return theme.mode === 'dark' ? 'light-content' : 'dark-content';
};

// Gradient colors for themed gradients
export const getThemedGradient = (theme: Theme, variant: 'primary' | 'success' | 'warning' | 'error' = 'primary') => {
  const gradients = {
    primary: theme.mode === 'dark' 
      ? ['#8fa4f3', '#6b82f0'] 
      : ['#667eea', '#764ba2'],
    success: theme.mode === 'dark'
      ? ['#4caf50', '#388e3c']
      : ['#28a745', '#20c997'],
    warning: theme.mode === 'dark'
      ? ['#ff9800', '#f57c00']
      : ['#ffc107', '#fd7e14'],
    error: theme.mode === 'dark'
      ? ['#f44336', '#d32f2f']
      : ['#dc3545', '#c82333'],
  };

  return gradients[variant];
};

export default ThemeContext;
