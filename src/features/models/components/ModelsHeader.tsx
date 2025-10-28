import React from 'react';
import { Button } from '../../../components/ui/Button';

interface ModelsHeaderProps {
  connected: boolean;
  version: string | null | undefined;
  connectionError: string | null | undefined;
  isRetrying: boolean;
  manualRetry: () => void;
}

export const ModelsHeader: React.FC<ModelsHeaderProps> = ({
  connected,
  version,
  connectionError,
  isRetrying,
  manualRetry,
}) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Models</h2>
        <div className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full ${connected ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`} aria-live="polite">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: connected ? '#22c55e' : '#ef4444' }} />
            Ollama: {connected ? `Connected${version ? ` (${version})` : ''}` : 'Disconnected'}
          </span>
          {!connected && (
            <div className="mt-2 text-xs">
              {connectionError && <div className="text-red-400 mb-1">{connectionError}</div>}
              {isRetrying ? (
                <div className="text-yellow-400">Retrying connection...</div>
              ) : (
                <div className="space-y-1">
                  <div>Troubleshooting:</div>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Ensure Ollama is installed and running</li>
                    <li>Check that it's accessible at http://localhost:11434</li>
                    <li>Try restarting Ollama service</li>
                  </ul>
                  <Button variant="secondary" onClick={manualRetry} className="mt-2">
                    Retry Connection
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
