import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSetting, setSetting } from '../services/database';

export type ThemeMode = 'modern' | 'sketch';

export interface ThemePalette {
  background: string;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
}

const modernPalette: ThemePalette = {
  background: '#f8fafc',
  cardBg: '#ffffff',
  cardBorder: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  accent: '#2563eb',
};

const sketchPalette: ThemePalette = {
  background: '#faf7f2', // Warm paper
  cardBg: '#ffffff',
  cardBorder: '#18181b', // Hand-drawn solid ink outline
  textPrimary: '#18181b',
  textSecondary: '#57534e',
  accent: '#ea580c', // Warm sketch accent
};

interface ThemeContextType {
  themeMode: ThemeMode;
  theme: ThemePalette;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isSketch: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'modern',
  theme: modernPalette,
  setThemeMode: async () => {},
  isSketch: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('modern');

  useEffect(() => {
    getSetting('app_theme', 'modern').then((saved) => {
      if (saved === 'sketch' || saved === 'modern') {
        setThemeModeState(saved as ThemeMode);
      }
    });
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await setSetting('app_theme', mode);
  };

  const theme = themeMode === 'sketch' ? sketchPalette : modernPalette;

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        theme,
        setThemeMode,
        isSketch: themeMode === 'sketch',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
