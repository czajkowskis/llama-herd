/**
 * Unit tests for uiPreferencesService
 * Tests localStorage persistence, get/set operations, and default values
 */

import {
  Theme,
  MessageDensity,
  getTheme,
  setTheme,
  getCompactMode,
  setCompactMode,
  getMessageDensity,
  setMessageDensity,
  getAllPreferences,
  setAllPreferences,
  resetPreferences,
  getEffectiveTheme,
  getTimeFormatPreference,
  setTimeFormatPreference,
} from './uiPreferencesService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia for system theme detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false, // Default to light mode
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('uiPreferencesService', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('Theme preferences', () => {
    it('should return default theme when nothing is stored', () => {
      expect(getTheme()).toBe('dark');
    });

    it('should store and retrieve light theme', () => {
      setTheme('light');
      expect(getTheme()).toBe('light');
      expect(localStorageMock.getItem('llama-herd-ui-theme')).toBe('light');
    });

    it('should store and retrieve dark theme', () => {
      setTheme('dark');
      expect(getTheme()).toBe('dark');
      expect(localStorageMock.getItem('llama-herd-ui-theme')).toBe('dark');
    });

    it('should store and retrieve system theme', () => {
      setTheme('system');
      expect(getTheme()).toBe('system');
      expect(localStorageMock.getItem('llama-herd-ui-theme')).toBe('system');
    });

    it('should return default theme for invalid stored value', () => {
      localStorageMock.setItem('llama-herd-ui-theme', 'invalid');
      expect(getTheme()).toBe('dark');
    });

    it('should get effective theme as dark when system is selected and prefers dark', () => {
      (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      setTheme('system');
      expect(getEffectiveTheme()).toBe('dark');
    });

    it('should get effective theme as light when system is selected and prefers light', () => {
      (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
        matches: query !== '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      setTheme('system');
      expect(getEffectiveTheme()).toBe('light');
    });

    it('should get effective theme directly when not system', () => {
      setTheme('light');
      expect(getEffectiveTheme()).toBe('light');

      setTheme('dark');
      expect(getEffectiveTheme()).toBe('dark');
    });
  });

  describe('Compact mode preferences', () => {
    it('should return default compact mode (false) when nothing is stored', () => {
      expect(getCompactMode()).toBe(false);
    });

    it('should store and retrieve compact mode enabled', () => {
      setCompactMode(true);
      expect(getCompactMode()).toBe(true);
      expect(localStorageMock.getItem('llama-herd-ui-compact-mode')).toBe('true');
    });

    it('should store and retrieve compact mode disabled', () => {
      setCompactMode(false);
      expect(getCompactMode()).toBe(false);
      expect(localStorageMock.getItem('llama-herd-ui-compact-mode')).toBe('false');
    });

    it('should handle boolean conversion correctly', () => {
      setCompactMode(true);
      expect(getCompactMode()).toBe(true);

      setCompactMode(false);
      expect(getCompactMode()).toBe(false);
    });
  });

  describe('Message density preferences', () => {
    it('should return default density (normal) when nothing is stored', () => {
      expect(getMessageDensity()).toBe('normal');
    });

    it('should store and retrieve sparse density', () => {
      setMessageDensity('sparse');
      expect(getMessageDensity()).toBe('sparse');
      expect(localStorageMock.getItem('llama-herd-ui-message-density')).toBe('sparse');
    });

    it('should store and retrieve normal density', () => {
      setMessageDensity('normal');
      expect(getMessageDensity()).toBe('normal');
      expect(localStorageMock.getItem('llama-herd-ui-message-density')).toBe('normal');
    });

    it('should store and retrieve dense density', () => {
      setMessageDensity('dense');
      expect(getMessageDensity()).toBe('dense');
      expect(localStorageMock.getItem('llama-herd-ui-message-density')).toBe('dense');
    });

    it('should return default density for invalid stored value', () => {
      localStorageMock.setItem('llama-herd-ui-message-density', 'invalid');
      expect(getMessageDensity()).toBe('normal');
    });
  });

  describe('Bulk operations', () => {
    it('should get all preferences at once', () => {
      setTheme('light');
      setCompactMode(true);
      setMessageDensity('dense');

      const prefs = getAllPreferences();
      expect(prefs).toEqual({
        theme: 'light',
        compactMode: true,
        messageDensity: 'dense',
      });
    });

    it('should set all preferences at once', () => {
      setAllPreferences({
        theme: 'dark',
        compactMode: false,
        messageDensity: 'sparse',
      });

      expect(getTheme()).toBe('dark');
      expect(getCompactMode()).toBe(false);
      expect(getMessageDensity()).toBe('sparse');
    });

    it('should set partial preferences', () => {
      // Set initial values
      setTheme('light');
      setCompactMode(true);
      setMessageDensity('dense');

      // Update only theme
      setAllPreferences({ theme: 'dark' });

      expect(getTheme()).toBe('dark');
      expect(getCompactMode()).toBe(true); // unchanged
      expect(getMessageDensity()).toBe('dense'); // unchanged
    });

    it('should reset all preferences to defaults', () => {
      setTheme('light');
      setCompactMode(true);
      setMessageDensity('dense');

      resetPreferences();

      expect(getTheme()).toBe('dark'); // default
      expect(getCompactMode()).toBe(false); // default
      expect(getMessageDensity()).toBe('normal'); // default
    });
  });

  describe('Time format preference', () => {
    it('should default to 24h when unset', () => {
      expect(getTimeFormatPreference()).toBe('24h');
    });

    it('should store and retrieve 12h/24h values', () => {
      setTimeFormatPreference('12h');
      expect(getTimeFormatPreference()).toBe('12h');
      setTimeFormatPreference('24h');
      expect(getTimeFormatPreference()).toBe('24h');
    });

    it('treats legacy system value as 24h', () => {
      // Simulate legacy value
      (window.localStorage as any).setItem('llama-herd-ui-time-format', 'system');
      expect(getTimeFormatPreference()).toBe('24h');
    });
  });

  describe('localStorage persistence', () => {
    it('should persist theme across multiple get/set operations', () => {
      setTheme('light');
      expect(getTheme()).toBe('light');

      setTheme('dark');
      expect(getTheme()).toBe('dark');

      setTheme('system');
      expect(getTheme()).toBe('system');
    });

    it('should persist compact mode across multiple get/set operations', () => {
      setCompactMode(true);
      expect(getCompactMode()).toBe(true);

      setCompactMode(false);
      expect(getCompactMode()).toBe(false);
    });

    it('should persist message density across multiple get/set operations', () => {
      setMessageDensity('sparse');
      expect(getMessageDensity()).toBe('sparse');

      setMessageDensity('normal');
      expect(getMessageDensity()).toBe('normal');

      setMessageDensity('dense');
      expect(getMessageDensity()).toBe('dense');
    });

    it('should maintain preferences after clearing other localStorage items', () => {
      setTheme('light');
      setCompactMode(true);
      setMessageDensity('dense');

      // Add and remove an unrelated item
      localStorageMock.setItem('other-key', 'value');
      localStorageMock.removeItem('other-key');

      expect(getTheme()).toBe('light');
      expect(getCompactMode()).toBe(true);
      expect(getMessageDensity()).toBe('dense');
    });
  });
});
