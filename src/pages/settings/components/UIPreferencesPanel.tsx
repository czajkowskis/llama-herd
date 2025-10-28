import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Theme, MessageDensity, TimeFormatPreference, setTimeFormatPreference } from '../../../services/uiPreferencesService';
import { MessagePreview } from './MessagePreview';

interface UIPreferencesPanelProps {
  theme: Theme;
  compactMode: boolean;
  messageDensity: MessageDensity;
  timeFormat: TimeFormatPreference;
  setTheme: (theme: Theme) => void;
  setCompactMode: (value: boolean) => void;
  setMessageDensity: (density: MessageDensity) => void;
  setTimeFormat: (format: TimeFormatPreference) => void;
}

export const UIPreferencesPanel: React.FC<UIPreferencesPanelProps> = ({
  theme,
  compactMode,
  messageDensity,
  timeFormat,
  setTheme,
  setCompactMode,
  setMessageDensity,
  setTimeFormat,
}) => {
  return (
    <div className="mt-10 p-4 rounded-xl max-w-2xl mx-auto text-left" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>UI Preferences</h3>
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        Customize the appearance and layout of the interface to improve readability and accessibility.
      </p>

      {/* Theme Toggle */}
      <div className="mb-6">
        <label className="block text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>Theme</label>
        <div className="flex space-x-3">
          <Button
            onClick={() => setTheme('light')}
            className={theme === 'light' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
            variant={theme === 'light' ? 'primary' : 'secondary'}
            data-testid="theme-light-button"
          >
            ☀️ Light
          </Button>
          <Button
            onClick={() => setTheme('dark')}
            className={theme === 'dark' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
            variant={theme === 'dark' ? 'primary' : 'secondary'}
            data-testid="theme-dark-button"
          >
            🌙 Dark
          </Button>
          <Button
            onClick={() => setTheme('system')}
            className={theme === 'system' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
            variant={theme === 'system' ? 'primary' : 'secondary'}
            data-testid="theme-system-button"
          >
            💻 System
          </Button>
        </div>
      </div>

      {/* Compact Mode Toggle */}
      <div className="mb-6">
        <label className="flex items-center justify-between">
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Compact Mode</span>
          <button
            onClick={() => setCompactMode(!compactMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              compactMode ? 'bg-purple-600' : ''
            }`}
            style={{ backgroundColor: compactMode ? undefined : 'var(--color-bg-tertiary)' }}
            data-testid="compact-mode-toggle"
            aria-label="Toggle compact mode"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                compactMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          Reduces padding and font sizes in the conversation list.
        </p>
      </div>

      {/* Message Density Slider */}
      <div className="mb-6">
        <label className="block text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>Message Density</label>
        <div className="flex items-center space-x-4">
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Sparse</span>
          <input
            type="range"
            min="0"
            max="2"
            value={messageDensity === 'sparse' ? 0 : messageDensity === 'normal' ? 1 : 2}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              const density: MessageDensity = value === 0 ? 'sparse' : value === 1 ? 'normal' : 'dense';
              setMessageDensity(density);
            }}
            className="flex-1"
            data-testid="message-density-slider"
            aria-label="Message density slider"
          />
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Dense</span>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          Current: <span className="font-medium text-purple-600" data-testid="current-density">{messageDensity}</span>
        </p>
      </div>

      {/* Time Format Selection */}
      <div className="mb-6">
        <label className="block text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>Time Format</label>
        <div className="flex items-center gap-2 flex-wrap">
          {(['12h','24h'] as TimeFormatPreference[]).map((opt) => {
            const selected = timeFormat === opt;
            const label = opt === '12h' ? '12-hour' : '24-hour';
            return (
              <Button
                key={opt}
                onClick={() => { setTimeFormatPreference(opt); setTimeFormat(opt); }}
                className={selected ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
                variant={selected ? 'primary' : 'secondary'}
                data-testid={`time-format-${opt}`}
              >
                {label}
              </Button>
            );
          })}
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          Current: <span className="font-medium text-purple-600" data-testid="current-time-format">{timeFormat}</span>
        </p>
        <div className="mt-3 rounded-lg p-3" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Preview: </span>
          <span className="text-xs font-mono" data-testid="time-format-preview">
            {new Date('2025-10-18T13:05:00Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: ((): boolean | undefined => {
              if (timeFormat === '12h') return true;
              if (timeFormat === '24h') return false;
              return undefined;
            })() })}
          </span>
        </div>
      </div>

      {/* Preview Area */}
      <MessagePreview />
    </div>
  );
};

