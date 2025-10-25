import { useState, useEffect, useCallback } from 'react';
import { ollamaService } from '../../../services/ollamaService';

interface OllamaConnectionState {
  connected: boolean;
  version?: string;
  connectionError?: string;
  isRetrying: boolean;
  manualRetry: () => void;
}

export const useOllamaConnection = (): OllamaConnectionState => {
  const [connected, setConnected] = useState(false);
  const [version, setVersion] = useState<string>();
  const [connectionError, setConnectionError] = useState<string>();
  const [isRetrying, setIsRetrying] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      setConnectionError(undefined);
      const version = await ollamaService.getVersion();
      setConnected(true);
      setVersion(version);
    } catch (error) {
      setConnected(false);
      setVersion(undefined);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    }
  }, []);

  const manualRetry = useCallback(() => {
    setIsRetrying(true);
    checkConnection().finally(() => setIsRetrying(false));
  }, [checkConnection]);

  // Initial connection check
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Periodic health checks
  useEffect(() => {
    if (!connected) return;

    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [connected, checkConnection]);

  return {
    connected,
    version,
    connectionError,
    isRetrying,
    manualRetry,
  };
};
