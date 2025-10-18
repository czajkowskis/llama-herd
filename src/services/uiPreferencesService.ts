/**
 * UI Preferences Service
 * 
 * Manages user interface preferences including theme, compact mode, and message density.
 * All preferences are persisted to localStorage and retrieved with sensible defaults.
 */

export type Theme = 'light' | 'dark' | 'system';
export type MessageDensity = 'sparse' | 'normal' | 'dense';

export interface UIPreferences {
  theme: Theme;
  compactMode: boolean;
  messageDensity: MessageDensity;
}

// localStorage keys
const STORAGE_KEY_PREFIX = 'llama-herd-ui-';
const STORAGE_KEY_THEME = `${STORAGE_KEY_PREFIX}theme`;
const STORAGE_KEY_COMPACT = `${STORAGE_KEY_PREFIX}compact-mode`;
const STORAGE_KEY_DENSITY = `${STORAGE_KEY_PREFIX}message-density`;

// Default values
const DEFAULT_THEME: Theme = 'dark';
const DEFAULT_COMPACT_MODE = false;
const DEFAULT_MESSAGE_DENSITY: MessageDensity = 'normal';

/**
 * Get the current theme preference
 */
export function getTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY_THEME);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return DEFAULT_THEME;
}

/**
 * Set the theme preference
 */
export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY_THEME, theme);
}

/**
 * Get the compact mode preference
 */
export function getCompactMode(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY_COMPACT);
  if (stored === null) return DEFAULT_COMPACT_MODE;
  return stored === 'true';
}

/**
 * Set the compact mode preference
 */
export function setCompactMode(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY_COMPACT, enabled.toString());
}

/**
 * Get the message density preference
 */
export function getMessageDensity(): MessageDensity {
  const stored = localStorage.getItem(STORAGE_KEY_DENSITY);
  if (stored === 'sparse' || stored === 'normal' || stored === 'dense') {
    return stored;
  }
  return DEFAULT_MESSAGE_DENSITY;
}

/**
 * Set the message density preference
 */
export function setMessageDensity(density: MessageDensity): void {
  localStorage.setItem(STORAGE_KEY_DENSITY, density);
}

/**
 * Get all UI preferences at once
 */
export function getAllPreferences(): UIPreferences {
  return {
    theme: getTheme(),
    compactMode: getCompactMode(),
    messageDensity: getMessageDensity(),
  };
}

/**
 * Set all UI preferences at once
 */
export function setAllPreferences(preferences: Partial<UIPreferences>): void {
  if (preferences.theme !== undefined) {
    setTheme(preferences.theme);
  }
  if (preferences.compactMode !== undefined) {
    setCompactMode(preferences.compactMode);
  }
  if (preferences.messageDensity !== undefined) {
    setMessageDensity(preferences.messageDensity);
  }
}

/**
 * Reset all preferences to defaults
 */
export function resetPreferences(): void {
  localStorage.removeItem(STORAGE_KEY_THEME);
  localStorage.removeItem(STORAGE_KEY_COMPACT);
  localStorage.removeItem(STORAGE_KEY_DENSITY);
}

/**
 * Get the effective theme (resolve 'system' to actual light/dark)
 */
export function getEffectiveTheme(): 'light' | 'dark' {
  const theme = getTheme();
  if (theme === 'system') {
    // Check system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (mediaQuery && typeof mediaQuery.matches === 'boolean') {
        return mediaQuery.matches ? 'dark' : 'light';
      }
    }
    return 'dark'; // fallback
  }
  return theme;
}
