import React, { useState, useEffect } from 'react';
import { ollamaService } from '../services/ollamaService';

// This page component handles application settings, particularly the Ollama connection.
const OLLAMA_BASE_URL = 'http://localhost:11434/api'; // Define here as it's specific to settings

export const Settings: React.FC = () => {
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isLoadingOllamaModels, setIsLoadingOllamaModels] = useState<boolean>(false);
  const [ollamaError, setOllamaError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      setIsLoadingOllamaModels(true);
      setOllamaError(null);
      try {
        const models = await ollamaService.listModels();
        setOllamaModels(models);
      } catch (err: any) {
        setOllamaError(err.message || 'Failed to fetch Ollama models.');
      } finally {
        setIsLoadingOllamaModels(false);
      }
    };
    fetchModels();
  }, []);

  return (
    <div className="p-8 text-center text-gray-400 animate-fade-in">
      <h2 className="text-2xl font-semibold mb-4">Settings</h2>
      <p>Configure your Ollama connection and other preferences.</p>
      <div className="mt-6 p-4 bg-gray-800 rounded-xl">
        <h3 className="text-lg font-medium text-white mb-2">Ollama Connection</h3>
        <p className="text-sm text-gray-400">
          Current API Endpoint: <code className="bg-gray-700 p-1 rounded-md">{OLLAMA_BASE_URL}</code>
        </p>
        {isLoadingOllamaModels && <p className="text-purple-300 mt-2">Checking Ollama connection...</p>}
        {ollamaError && <p className="text-red-400 mt-2">Error: {ollamaError}</p>}
        {!isLoadingOllamaModels && !ollamaError && ollamaModels.length > 0 && (
          <p className="text-green-400 mt-2">Ollama connected. Found {ollamaModels.length} models.</p>
        )}
      </div>
    </div>
  );
};
