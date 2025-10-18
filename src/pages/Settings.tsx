import React, { useState, useEffect } from 'react';
import { ollamaService } from '../services/ollamaService';
import { OLLAMA_BASE_URL as DEFAULT_OLLAMA_BASE } from '../config';
import { Button } from '../components/ui/Button';
import { useUIPreferences } from '../hooks/useUIPreferences';
import { Theme, MessageDensity, getTimeFormatPreference, setTimeFormatPreference, TimeFormatPreference } from '../services/uiPreferencesService';

// Keys for localStorage
const STORAGE_KEY_BASE = 'llama-herd-ollama-base-url';
const STORAGE_KEY_MODEL = 'llama-herd-default-ollama-model';

// This page component handles application settings, particularly the Ollama connection.
export const Settings: React.FC = () => {
  // UI Preferences hook
  const {
    theme,
    compactMode,
    messageDensity,
    setTheme,
    setCompactMode,
    setMessageDensity,
  } = useUIPreferences();

  const [endpoint, setEndpoint] = useState<string>(() => {
    // Use the configured base URL (no '/api' appended) to avoid duplicate '/api/api'
    return localStorage.getItem(STORAGE_KEY_BASE) || DEFAULT_OLLAMA_BASE;
  });
  const [endpointError, setEndpointError] = useState<string | null>(null);

  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResultMessage, setTestResultMessage] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_MODEL) || '';
  });

  // Time format preference state
  const [timeFormat, setTimeFormat] = useState<TimeFormatPreference>(getTimeFormatPreference);

  // Validate endpoint URL roughly. It should be an absolute URL.
  const validateUrl = (value: string): string | null => {
    try {
      const u = new URL(value);
      if (!u.protocol.startsWith('http')) return 'Only http/https URLs are supported.';
      return null;
    } catch (e) {
      return 'Invalid URL';
    }
  };

  useEffect(() => {
    const err = validateUrl(endpoint);
    setEndpointError(err);
  }, [endpoint]);

  const handleTest = async () => {
    setIsTesting(true);
    setTestError(null);
    setTestResultMessage(null);
    setOllamaModels([]);

    // Ensure endpoint doesn't end with a trailing slash
    const base = endpoint.replace(/\/$/, '');

    try {
      const models = await ollamaService.listModels(base);
      setOllamaModels(models);
      setTestResultMessage(`Connected — ${models.length} models`);
      // If there's a previously selected model, keep it; otherwise pick first
      if (!selectedModel && models.length > 0) {
        setSelectedModel(models[0]);
      }
    } catch (err: any) {
      setTestError(err?.message || String(err) || 'Failed to connect');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY_BASE, endpoint.replace(/\/$/, ''));
    if (selectedModel) {
      localStorage.setItem(STORAGE_KEY_MODEL, selectedModel);
    } else {
      localStorage.removeItem(STORAGE_KEY_MODEL);
    }
    setTestResultMessage('Saved');
    setTimeout(() => setTestResultMessage(null), 1500);
  };

  return (
    <div className="p-8 text-center animate-fade-in" style={{ color: 'var(--color-text-tertiary)' }}>
      <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Settings</h2>
      <p>Configure your Ollama connection and other preferences.</p>
      <div className="mt-6 p-4 rounded-xl max-w-2xl mx-auto text-left" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Ollama Connection</h3>

        <label className="block text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>Ollama API endpoint</label>
        <div className="flex space-x-3">
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className={`flex-1 p-3 rounded-xl border ${endpointError ? 'border-red-500' : ''} focus:outline-none focus:ring-2 focus:ring-purple-500`}
            style={{ 
              backgroundColor: 'var(--color-bg-tertiary)', 
              color: 'var(--color-text-primary)',
              borderColor: endpointError ? '#ef4444' : 'var(--color-border)'
            }}
            placeholder="http://localhost:11434/api"
            aria-label="Ollama API endpoint"
          />
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleTest}
              disabled={!!endpointError || isTesting}
              variant="secondary"
            >
              {isTesting ? 'Testing…' : 'Test connection'}
            </Button>

            <Button
              onClick={handleSave}
              disabled={!!endpointError}
            >
              Save
            </Button>
          </div>
        </div>
        {endpointError && <p className="text-red-500 mt-2 font-medium">{endpointError}</p>}

        <div className="mt-4">
          {isTesting && <p className="text-purple-600 font-medium">Testing connection…</p>}
          {testError && <p className="text-red-500 mt-2 font-medium">Error: {testError}</p>}
          {testResultMessage && !testError && (
            <p className="text-green-600 mt-2 font-medium">{testResultMessage}</p>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>Default model (optional)</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500"
            style={{ 
              backgroundColor: 'var(--color-bg-tertiary)', 
              color: 'var(--color-text-primary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <option value="">(no default)</option>
            {isTesting ? (
              <option disabled>Testing models…</option>
            ) : ollamaModels.length > 0 ? (
              ollamaModels.map((m, i) => <option key={i} value={m}>{m}</option>)
            ) : (
              <option disabled>No models — test connection to populate</option>
            )}
          </select>
        </div>

      </div>

      {/* UI Preferences Section */}
      <div className="mt-6 p-4 rounded-xl max-w-2xl mx-auto text-left" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
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
        <div className="mt-6">
          <label className="block text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>Preview</label>
          <div className="rounded-xl p-4 space-y-2" data-testid="preview-area" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
            <div className="preview-message message-container rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
              <div className="flex space-x-3">
                <div className={`agent-avatar flex-shrink-0 w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-sm font-semibold text-white`}>
                  A
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Agent Name</div>
                  <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>This is a preview message showing the current density and compact mode settings.</div>
                </div>
              </div>
            </div>
            <div className="preview-message message-container rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
              <div className="flex space-x-3">
                <div className={`agent-avatar flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold text-white`}>
                  B
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Another Agent</div>
                  <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>The preview updates in real-time as you change settings.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
