import { useState, useEffect, useCallback } from 'react';
import {
  Theme,
  MessageDensity,
  UIPreferences,
  getTheme,
  setTheme as setThemeInStorage,
  getCompactMode,
  setCompactMode as setCompactModeInStorage,
  getMessageDensity,
  setMessageDensity as setMessageDensityInStorage,
  getAllPreferences,
  getEffectiveTheme,
} from '../services/uiPreferencesService';

/**
 * Custom hook to manage UI preferences
 * Handles state, persistence, and DOM updates for theme and layout preferences
 */
export function useUIPreferences() {
  const [theme, setThemeState] = useState<Theme>(getTheme);
  const [compactMode, setCompactModeState] = useState<boolean>(getCompactMode);
  const [messageDensity, setMessageDensityState] = useState<MessageDensity>(getMessageDensity);

  // Apply theme to document root
  const applyTheme = useCallback((themeValue: Theme) => {
    let effectiveTheme: 'light' | 'dark' = 'dark'; // default fallback
    
    if (themeValue === 'system') {
      // Check system preference safely
      if (typeof window !== 'undefined' && window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        if (mediaQuery && typeof mediaQuery.matches === 'boolean') {
          effectiveTheme = mediaQuery.matches ? 'dark' : 'light';
        }
      }
    } else {
      effectiveTheme = themeValue;
    }
    
    const root = document.documentElement;
    if (effectiveTheme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  }, []);

  // Apply compact mode to document root
  const applyCompactMode = useCallback((enabled: boolean) => {
    const root = document.documentElement;
    if (enabled) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }
  }, []);

  // Apply message density to document root
  const applyMessageDensity = useCallback((density: MessageDensity) => {
    const root = document.documentElement;
    // Remove all density classes first
    root.classList.remove('density-sparse', 'density-normal', 'density-dense');
    // Add the selected density class
    root.classList.add(`density-${density}`);
  }, []);

  // Set theme with persistence and DOM update
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    setThemeInStorage(newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  // Set compact mode with persistence and DOM update
  const setCompactMode = useCallback((enabled: boolean) => {
    setCompactModeState(enabled);
    setCompactModeInStorage(enabled);
    applyCompactMode(enabled);
  }, [applyCompactMode]);

  // Set message density with persistence and DOM update
  const setMessageDensity = useCallback((density: MessageDensity) => {
    setMessageDensityState(density);
    setMessageDensityInStorage(density);
    applyMessageDensity(density);
  }, [applyMessageDensity]);

  // Initialize preferences on mount
  useEffect(() => {
    const preferences = getAllPreferences();
    applyTheme(preferences.theme);
    applyCompactMode(preferences.compactMode);
    applyMessageDensity(preferences.messageDensity);

    // Listen for system theme changes when theme is set to 'system'
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        if (getTheme() === 'system') {
          applyTheme('system');
        }
      };
      
      if (mediaQuery && mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      }
    }
    
    return undefined;
  }, [applyTheme, applyCompactMode, applyMessageDensity]);

  return {
    theme,
    compactMode,
    messageDensity,
    setTheme,
    setCompactMode,
    setMessageDensity,
    effectiveTheme: getEffectiveTheme(),
  };
}
