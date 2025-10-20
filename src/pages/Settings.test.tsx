/**
 * Component tests for Settings page UI Preferences
 * Tests theme toggle, compact mode, density slider, persistence, and preview
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Settings } from './Settings';
import * as uiPreferencesService from '../services/uiPreferencesService';

// Mock the ollama service to avoid network calls
jest.mock('../services/ollamaService', () => ({
  ollamaService: {
    listModels: jest.fn(() => ['llama2', 'codellama']),
  },
}));

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

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('Settings - UI Preferences', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Reset DOM classes
    document.documentElement.className = '';
  });

  describe('Theme Toggle', () => {
    it('should render theme toggle buttons', () => {
      render(<Settings />);

      expect(screen.getByTestId('theme-light-button')).toBeInTheDocument();
      expect(screen.getByTestId('theme-dark-button')).toBeInTheDocument();
      expect(screen.getByTestId('theme-system-button')).toBeInTheDocument();
    });

    it('should highlight dark theme button by default', () => {
      render(<Settings />);

      const darkButton = screen.getByTestId('theme-dark-button');
      expect(darkButton).toHaveClass('bg-purple-600');
    });

    it('should change theme when button is clicked', () => {
      render(<Settings />);

      const lightButton = screen.getByTestId('theme-light-button');
      fireEvent.click(lightButton);

      expect(lightButton).toHaveClass('bg-purple-600');
      expect(uiPreferencesService.getTheme()).toBe('light');
    });

    it('should update DOM class when theme changes to light', () => {
      render(<Settings />);

      const lightButton = screen.getByTestId('theme-light-button');
      fireEvent.click(lightButton);

      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should update DOM class when theme changes to dark', () => {
      render(<Settings />);

      const lightButton = screen.getByTestId('theme-light-button');
      fireEvent.click(lightButton);

      const darkButton = screen.getByTestId('theme-dark-button');
      fireEvent.click(darkButton);

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });

    it('should persist theme preference across re-renders', () => {
      const { unmount } = render(<Settings />);

      const lightButton = screen.getByTestId('theme-light-button');
      fireEvent.click(lightButton);

      unmount();

      // Re-render
      render(<Settings />);

      const lightButtonAfterRerender = screen.getByTestId('theme-light-button');
      expect(lightButtonAfterRerender).toHaveClass('bg-purple-600');
    });

    it('should switch between all three theme options', () => {
      render(<Settings />);

      const lightButton = screen.getByTestId('theme-light-button');
      const darkButton = screen.getByTestId('theme-dark-button');
      const systemButton = screen.getByTestId('theme-system-button');

      fireEvent.click(lightButton);
      expect(uiPreferencesService.getTheme()).toBe('light');

      fireEvent.click(systemButton);
      expect(uiPreferencesService.getTheme()).toBe('system');

      fireEvent.click(darkButton);
      expect(uiPreferencesService.getTheme()).toBe('dark');
    });
  });

  describe('Compact Mode Toggle', () => {
    it('should render compact mode toggle', () => {
      render(<Settings />);

      expect(screen.getByTestId('compact-mode-toggle')).toBeInTheDocument();
    });

    it('should be disabled by default', () => {
      render(<Settings />);

      expect(uiPreferencesService.getCompactMode()).toBe(false);
    });

    it('should toggle compact mode when clicked', () => {
      render(<Settings />);

      const toggle = screen.getByTestId('compact-mode-toggle');
      fireEvent.click(toggle);

      expect(uiPreferencesService.getCompactMode()).toBe(true);
    });

    it('should update DOM class when compact mode is enabled', () => {
      render(<Settings />);

      const toggle = screen.getByTestId('compact-mode-toggle');
      fireEvent.click(toggle);

      expect(document.documentElement.classList.contains('compact-mode')).toBe(true);
    });

    it('should remove DOM class when compact mode is disabled', () => {
      render(<Settings />);

      const toggle = screen.getByTestId('compact-mode-toggle');
      fireEvent.click(toggle); // Enable
      fireEvent.click(toggle); // Disable

      expect(document.documentElement.classList.contains('compact-mode')).toBe(false);
    });

    it('should persist compact mode preference', () => {
      const { unmount } = render(<Settings />);

      const toggle = screen.getByTestId('compact-mode-toggle');
      fireEvent.click(toggle);

      unmount();

      // Re-render
      render(<Settings />);

      expect(uiPreferencesService.getCompactMode()).toBe(true);
    });

    it('should show visual feedback when enabled', () => {
      render(<Settings />);

      const toggle = screen.getByTestId('compact-mode-toggle');
      
      // Initially disabled - uses inline style with CSS variable
      expect(toggle).toHaveStyle({ backgroundColor: 'var(--color-bg-tertiary)' });

      fireEvent.click(toggle);

      // After enable - uses bg-purple-600 class
      expect(toggle).toHaveClass('bg-purple-600');
    });
  });

  describe('Message Density Slider', () => {
    it('should render message density slider', () => {
      render(<Settings />);

      expect(screen.getByTestId('message-density-slider')).toBeInTheDocument();
    });

    it('should show current density value', () => {
      render(<Settings />);

      expect(screen.getByTestId('current-density')).toHaveTextContent('normal');
    });

    it('should change density to sparse when slider is at 0', () => {
      render(<Settings />);

      const slider = screen.getByTestId('message-density-slider') as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '0' } });

      expect(uiPreferencesService.getMessageDensity()).toBe('sparse');
      expect(screen.getByTestId('current-density')).toHaveTextContent('sparse');
    });

    it('should change density to normal when slider is at 1', () => {
      render(<Settings />);

      const slider = screen.getByTestId('message-density-slider') as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '1' } });

      expect(uiPreferencesService.getMessageDensity()).toBe('normal');
      expect(screen.getByTestId('current-density')).toHaveTextContent('normal');
    });

    it('should change density to dense when slider is at 2', () => {
      render(<Settings />);

      const slider = screen.getByTestId('message-density-slider') as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '2' } });

      expect(uiPreferencesService.getMessageDensity()).toBe('dense');
      expect(screen.getByTestId('current-density')).toHaveTextContent('dense');
    });

    it('should update DOM class when density changes', () => {
      render(<Settings />);

      const slider = screen.getByTestId('message-density-slider') as HTMLInputElement;
      
      fireEvent.change(slider, { target: { value: '0' } });
      expect(document.documentElement.classList.contains('density-sparse')).toBe(true);

      fireEvent.change(slider, { target: { value: '1' } });
      expect(document.documentElement.classList.contains('density-normal')).toBe(true);
      expect(document.documentElement.classList.contains('density-sparse')).toBe(false);

      fireEvent.change(slider, { target: { value: '2' } });
      expect(document.documentElement.classList.contains('density-dense')).toBe(true);
      expect(document.documentElement.classList.contains('density-normal')).toBe(false);
    });

    it('should persist density preference', () => {
      const { unmount } = render(<Settings />);

      const slider = screen.getByTestId('message-density-slider') as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '2' } });

      unmount();

      // Re-render
      render(<Settings />);

      expect(uiPreferencesService.getMessageDensity()).toBe('dense');
      expect(screen.getByTestId('current-density')).toHaveTextContent('dense');
    });
  });

  describe('Preview Area', () => {
    it('should render preview area', () => {
      render(<Settings />);

      expect(screen.getByTestId('preview-area')).toBeInTheDocument();
    });

    it('should show preview messages', () => {
      render(<Settings />);

      const previewArea = screen.getByTestId('preview-area');
      const messages = previewArea.querySelectorAll('.preview-message');
      
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should apply message-container class to preview messages', () => {
      render(<Settings />);

      const previewArea = screen.getByTestId('preview-area');
      const messageContainers = previewArea.querySelectorAll('.message-container');
      
      expect(messageContainers.length).toBeGreaterThan(0);
    });

    it('should apply agent-avatar class to preview avatars', () => {
      render(<Settings />);

      const previewArea = screen.getByTestId('preview-area');
      const avatars = previewArea.querySelectorAll('.agent-avatar');
      
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  describe('Integration - Multiple Preferences', () => {
    it('should allow changing multiple preferences independently', () => {
      render(<Settings />);

      // Change theme
      const lightButton = screen.getByTestId('theme-light-button');
      fireEvent.click(lightButton);

      // Enable compact mode
      const compactToggle = screen.getByTestId('compact-mode-toggle');
      fireEvent.click(compactToggle);

      // Change density
      const slider = screen.getByTestId('message-density-slider') as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '2' } });

      // Verify all changes persisted
      expect(uiPreferencesService.getTheme()).toBe('light');
      expect(uiPreferencesService.getCompactMode()).toBe(true);
      expect(uiPreferencesService.getMessageDensity()).toBe('dense');

      // Verify DOM classes
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('compact-mode')).toBe(true);
      expect(document.documentElement.classList.contains('density-dense')).toBe(true);
    });

    it('should persist all preferences across remount', () => {
      const { unmount } = render(<Settings />);

      // Set all preferences
      fireEvent.click(screen.getByTestId('theme-light-button'));
      fireEvent.click(screen.getByTestId('compact-mode-toggle'));
      const slider = screen.getByTestId('message-density-slider') as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '0' } });

      unmount();

      // Re-render
      render(<Settings />);

      // Verify persistence
      expect(uiPreferencesService.getTheme()).toBe('light');
      expect(uiPreferencesService.getCompactMode()).toBe(true);
      expect(uiPreferencesService.getMessageDensity()).toBe('sparse');
    });
  });

  describe('Time Format Preference', () => {
    it('renders time format buttons and shows default 24h', () => {
      render(<Settings />);
      expect(screen.getByTestId('time-format-12h')).toBeInTheDocument();
      expect(screen.getByTestId('time-format-24h')).toBeInTheDocument();
      expect(screen.getByTestId('current-time-format')).toHaveTextContent('24h');
    });

    it('allows switching to 12h and 24h and persists', () => {
      render(<Settings />);
      fireEvent.click(screen.getByTestId('time-format-12h'));
      expect(uiPreferencesService.getTimeFormatPreference()).toBe('12h');
      expect(screen.getByTestId('current-time-format')).toHaveTextContent('12h');

      fireEvent.click(screen.getByTestId('time-format-24h'));
      expect(uiPreferencesService.getTimeFormatPreference()).toBe('24h');
      expect(screen.getByTestId('current-time-format')).toHaveTextContent('24h');
    });

    it('updates preview according to selection', () => {
      render(<Settings />);
      fireEvent.click(screen.getByTestId('time-format-12h'));
      const preview12h = screen.getByTestId('time-format-preview').textContent as string;
      fireEvent.click(screen.getByTestId('time-format-24h'));
      const preview24h = screen.getByTestId('time-format-preview').textContent as string;
      // 12h should include AM/PM markers; 24h should not
      expect(/am|pm/i.test(preview12h)).toBe(true);
      expect(/am|pm/i.test(preview24h)).toBe(false);
    });

    it('persists time format across remount', () => {
      const { unmount } = render(<Settings />);
      fireEvent.click(screen.getByTestId('time-format-24h'));
      unmount();
      render(<Settings />);
      expect(uiPreferencesService.getTimeFormatPreference()).toBe('24h');
      expect(screen.getByTestId('current-time-format')).toHaveTextContent('24h');
    });
  });
});
