import React, { useState, useEffect } from 'react';
import { ollamaService } from '../services/ollamaService';
import { OLLAMA_BASE_URL as DEFAULT_OLLAMA_BASE } from '../config';
import { Button } from '../components/ui/Button';

// Keys for localStorage
const STORAGE_KEY_BASE = 'llama-herd-ollama-base-url';
const STORAGE_KEY_MODEL = 'llama-herd-default-ollama-model';

// This page component handles application settings, particularly the Ollama connection.
export const Settings: React.FC = () => {
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
    <div className="p-8 text-center text-gray-400 animate-fade-in">
      <h2 className="text-2xl font-semibold mb-4">Settings</h2>
      <p>Configure your Ollama connection and other preferences.</p>
      <div className="mt-6 p-4 bg-gray-800 rounded-xl max-w-2xl mx-auto text-left">
        <h3 className="text-lg font-medium text-white mb-2">Ollama Connection</h3>

        <label className="block text-sm text-gray-300 mb-1">Ollama API endpoint</label>
        <div className="flex space-x-3">
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className={`flex-1 p-3 rounded-xl bg-gray-700 text-white border ${endpointError ? 'border-red-500' : 'border-gray-600'} focus:outline-none`}
            placeholder="http://localhost:11434/api"
            aria-label="Ollama API endpoint"
          />
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleTest}
              disabled={!!endpointError || isTesting}
              className="bg-gray-600"
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
        {endpointError && <p className="text-red-400 mt-2">{endpointError}</p>}

        <div className="mt-4">
          {isTesting && <p className="text-purple-300">Testing connection…</p>}
          {testError && <p className="text-red-400 mt-2">Error: {testError}</p>}
          {testResultMessage && !testError && (
            <p className="text-green-400 mt-2">{testResultMessage}</p>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-sm text-gray-300 mb-1">Default model (optional)</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full p-3 rounded-xl bg-gray-700 text-white border border-gray-600"
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
    </div>
  );
};
