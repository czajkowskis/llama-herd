import React, { useState, useEffect } from 'react';
import { ollamaService } from '../services/ollamaService';
import { OLLAMA_BASE_URL as DEFAULT_OLLAMA_BASE } from '../config';
import { useUIPreferences } from '../hooks/useUIPreferences';
import { getTimeFormatPreference, setTimeFormatPreference, TimeFormatPreference } from '../services/uiPreferencesService';
import { ConnectionStatusType } from '../components/ui/ConnectionStatus';
import { usePullTasks } from '../hooks/usePullTasks';
import { PullNotification } from '../components/ui/PullNotification';
import { ConnectionSettings } from './settings/components/ConnectionSettings';
import { UIPreferencesPanel } from './settings/components/UIPreferencesPanel';

const STORAGE_KEY_BASE = 'llama-herd-ollama-base-url';

export const Settings: React.FC = () => {
  const { theme, compactMode, messageDensity, setTheme, setCompactMode, setMessageDensity } = useUIPreferences();
  
  const [endpoint, setEndpoint] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_BASE) || DEFAULT_OLLAMA_BASE;
  });
  const [endpointError, setEndpointError] = useState<string | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResultMessage, setTestResultMessage] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusType>('disconnected');
  const [timeFormat, setTimeFormat] = useState<TimeFormatPreference>(getTimeFormatPreference);
  const { activePulls } = usePullTasks();

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

  useEffect(() => {
    if (!endpointError && endpoint) {
      try {
        localStorage.setItem(STORAGE_KEY_BASE, endpoint.replace(/\/$/, ''));
      } catch (e) {
        console.warn('Failed to persist Ollama endpoint to localStorage', e);
      }
    }
  }, [endpoint, endpointError]);

  useEffect(() => {
    if (isTesting) {
      setConnectionStatus('reconnecting');
    } else if (testError) {
      setConnectionStatus('error');
    } else if (testResultMessage) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [isTesting, testError, testResultMessage]);

  useEffect(() => {
    if (!endpointError && endpoint) {
      handleTest();
    }
  }, []);

  const handleTest = async () => {
    setIsTesting(true);
    setTestError(null);
    setTestResultMessage(null);
    setOllamaModels([]);

    const base = endpoint.replace(/\/$/, '');

    try {
      const models = await ollamaService.listModels(base);
      setOllamaModels(models);
      setTestResultMessage('Connected');
    } catch (err: any) {
      setTestError(err?.message || String(err) || 'Failed to connect');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY_BASE, endpoint.replace(/\/$/, ''));
    setTestResultMessage('Saved');
    setTimeout(() => setTestResultMessage(null), 1500);
  };

  return (
    <div className="p-8 text-center animate-fade-in" style={{ color: 'var(--color-text-tertiary)' }}>
      <PullNotification activePulls={activePulls} />
      <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Settings</h2>
      <p>Configure your Ollama connection and other preferences.</p>
      
      <ConnectionSettings
        endpoint={endpoint}
        endpointError={endpointError}
        isTesting={isTesting}
        connectionStatus={connectionStatus}
        testError={testError}
        testResultMessage={testResultMessage}
        onEndpointChange={setEndpoint}
        onTest={handleTest}
        onSave={handleSave}
      />

      <UIPreferencesPanel
        theme={theme}
        compactMode={compactMode}
        messageDensity={messageDensity}
        timeFormat={timeFormat}
        setTheme={setTheme}
        setCompactMode={setCompactMode}
        setMessageDensity={setMessageDensity}
        setTimeFormat={setTimeFormat}
      />
    </div>
  );
};
