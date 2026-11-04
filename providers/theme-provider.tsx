import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { lightTheme, darkTheme, toNavigationTheme, type Theme, type ThemeMode } from '@/constants/theme';

const STORAGE_KEY = 'lokkhyo-theme-mode';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [hydrated, setHydrated] = useState(false);

  // Load persisted mode on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        setModeState(stored as ThemeMode);
      }
      setHydrated(true);
    });
  }, []);

  // Persist mode changes
  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode).catch(() => {});
  };

  const resolved = mode === 'system' ? (systemScheme ?? 'light') : mode;
  const theme = useMemo(() => (resolved === 'dark' ? darkTheme : lightTheme), [resolved]);
  const navTheme = useMemo(() => toNavigationTheme(theme), [theme]);

  // Apply theme to document for web
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.colorScheme = resolved;
    }
  }, [resolved]);

  if (!hydrated) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode }}>
      <NavigationThemeProvider value={navTheme}>
        {children}
      </NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context.theme;
}

export function useThemeMode(): { mode: ThemeMode; setMode: (mode: ThemeMode) => void } {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return { mode: context.mode, setMode: context.setMode };
}