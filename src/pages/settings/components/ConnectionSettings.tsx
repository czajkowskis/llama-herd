import React from 'react';
import { Button } from '../../../components/ui/Button';
import { ConnectionStatus, ConnectionStatusType } from '../../../components/ui/ConnectionStatus';

interface ConnectionSettingsProps {
  endpoint: string;
  endpointError: string | null;
  isTesting: boolean;
  connectionStatus: ConnectionStatusType;
  testError: string | null;
  testResultMessage: string | null;
  onEndpointChange: (value: string) => void;
  onTest: () => void;
  onSave: () => void;
}

export const ConnectionSettings: React.FC<ConnectionSettingsProps> = ({
  endpoint,
  endpointError,
  isTesting,
  connectionStatus,
  testError,
  testResultMessage,
  onEndpointChange,
  onTest,
  onSave,
}) => {
  return (
    <div className="mt-6 p-4 rounded-xl max-w-2xl mx-auto text-left" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>Ollama Connection</h3>
        <ConnectionStatus
          status={connectionStatus}
          errorMessage={testError || undefined}
        />
      </div>

      <label className="block text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>Ollama API endpoint</label>
      <div className="flex space-x-3">
        <input
          value={endpoint}
          onChange={(e) => onEndpointChange(e.target.value)}
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
            onClick={onTest}
            disabled={!!endpointError || isTesting}
            variant="secondary"
          >
            {isTesting ? 'Testing…' : 'Test connection'}
          </Button>
          <Button
            onClick={onSave}
            disabled={!!endpointError}
          >
            Save
          </Button>
        </div>
      </div>
      {endpointError && <p className="text-red-500 mt-2 font-medium">{endpointError}</p>}

      <div className="mt-4 flex flex-col items-center space-y-4">
        <a 
          href="#/models" 
          className={`inline-flex items-center px-4 py-2 rounded-xl transition-colors ${
            testResultMessage && !testError && !isTesting
              ? 'cursor-pointer' 
              : 'cursor-not-allowed opacity-50'
          }`}
          style={{
            backgroundColor: testResultMessage && !testError && !isTesting 
              ? 'var(--color-bg-tertiary)' 
              : '#9ca3af',
            color: testResultMessage && !testError && !isTesting 
              ? 'var(--color-text-primary)' 
              : '#e5e7eb',
            border: testResultMessage && !testError && !isTesting 
              ? '1px solid var(--color-border)' 
              : '1px solid #9ca3af'
          }}
          onMouseEnter={(e) => {
            if (testResultMessage && !testError && !isTesting) {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
            }
          }}
          onMouseLeave={(e) => {
            if (testResultMessage && !testError && !isTesting) {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
            }
          }}
          aria-label="Manage models"
          onClick={(e) => {
            if (!testResultMessage || testError || isTesting) {
              e.preventDefault();
            }
          }}
        >
          Manage Models
        </a>
        {(!testResultMessage || testError || isTesting) && (
          <p className="text-xs text-center" style={{ color: 'var(--color-text-tertiary)' }}>
            Test connection first to access model management
          </p>
        )}
      </div>
    </div>
  );
};

