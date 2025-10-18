import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';

export type ConnectionStatusType = 'connected' | 'reconnecting' | 'disconnected' | 'error';

export interface ConnectionStatusProps {
  status: ConnectionStatusType;
  reconnectAttempt?: number;
  maxReconnectAttempts?: number;
  reconnectIn?: number; // seconds until next reconnect
  errorMessage?: string;
  onRetry?: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  reconnectAttempt = 0,
  maxReconnectAttempts,
  reconnectIn,
  errorMessage,
  onRetry,
}) => {
  const [countdown, setCountdown] = useState(reconnectIn || 0);

  useEffect(() => {
    if (status === 'reconnecting' && reconnectIn) {
      setCountdown(reconnectIn);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [status, reconnectIn]);

  const getStatusDisplay = () => {
    switch (status) {
      case 'connected':
        return (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-700 text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium">Connected</span>
          </div>
        );

      case 'reconnecting':
        return (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-700 text-yellow-400">
            <Icon className="animate-spin">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </Icon>
            <span className="text-xs font-medium">
              Reconnecting
              {reconnectAttempt > 0 && maxReconnectAttempts && (
                <span className="ml-1">({reconnectAttempt}/{maxReconnectAttempts})</span>
              )}
              {countdown > 0 && <span className="ml-1">in {countdown}s</span>}
            </span>
          </div>
        );

      case 'disconnected':
        return (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-700">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-xs font-medium text-red-400">Disconnected</span>
            {onRetry && (
              <button
                onClick={onRetry}
                className="ml-2 px-2 py-0.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                title="Retry connection"
              >
                Retry
              </button>
            )}
          </div>
        );

      case 'error':
        return (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-700">
            <Icon className="text-red-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </Icon>
            <span className="text-xs font-medium text-red-400">
              Error{errorMessage && `: ${errorMessage}`}
            </span>
            {onRetry && (
              <button
                onClick={onRetry}
                className="ml-2 px-2 py-0.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                title="Retry connection"
              >
                Retry
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return <>{getStatusDisplay()}</>;
};
