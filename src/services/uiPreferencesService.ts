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
const STORAGE_KEY_STARRED = `${STORAGE_KEY_PREFIX}starred-messages`;

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

// ============================================================================
// Starred Messages Management
// ============================================================================

interface StarredMessagesStorage {
  [conversationId: string]: string[]; // conversation/experiment ID -> array of message IDs
}

/**
 * Load starred messages from localStorage
 */
function loadStarredStorage(): StarredMessagesStorage {
  try {
    const data = localStorage.getItem(STORAGE_KEY_STARRED);
    if (!data) return {};
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load starred messages:', error);
    return {};
  }
}

/**
 * Save starred messages to localStorage
 */
function saveStarredStorage(storage: StarredMessagesStorage): void {
  try {
    localStorage.setItem(STORAGE_KEY_STARRED, JSON.stringify(storage));
  } catch (error) {
    console.error('Failed to save starred messages:', error);
  }
}

/**
 * Get all starred message IDs for a specific conversation/experiment
 */
export function getStarredMessages(conversationId: string): Set<string> {
  try {
    const storage = loadStarredStorage();
    const messageIds = storage[conversationId] || [];
    return new Set(messageIds);
  } catch (error) {
    console.error('Failed to get starred messages:', error);
    return new Set();
  }
}

/**
 * Toggle starred state for a message
 * Returns true if message is now starred, false if unstarred
 */
export function toggleStarredMessage(conversationId: string, messageId: string): boolean {
  try {
    const storage = loadStarredStorage();
    const messageIds = storage[conversationId] || [];
    const index = messageIds.indexOf(messageId);

    if (index > -1) {
      // Remove from starred
      messageIds.splice(index, 1);
      if (messageIds.length === 0) {
        delete storage[conversationId];
      } else {
        storage[conversationId] = messageIds;
      }
      saveStarredStorage(storage);
      return false; // Not starred
    } else {
      // Add to starred
      storage[conversationId] = [...messageIds, messageId];
      saveStarredStorage(storage);
      return true; // Starred
    }
  } catch (error) {
    console.error('Failed to toggle starred message:', error);
    return false;
  }
}

/**
 * Check if a message is starred
 */
export function isMessageStarred(conversationId: string, messageId: string): boolean {
  try {
    const storage = loadStarredStorage();
    const messageIds = storage[conversationId] || [];
    return messageIds.includes(messageId);
  } catch (error) {
    console.error('Failed to check starred status:', error);
    return false;
  }
}

/**
 * Clear all starred messages for a conversation/experiment
 */
export function clearStarredMessages(conversationId: string): void {
  try {
    const storage = loadStarredStorage();
    delete storage[conversationId];
    saveStarredStorage(storage);
  } catch (error) {
    console.error('Failed to clear starred messages:', error);
  }
}
