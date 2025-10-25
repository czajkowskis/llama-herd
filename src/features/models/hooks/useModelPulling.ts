import { useState, useCallback } from 'react';
import { ollamaService } from '../../../services/ollamaService';

interface PullProgress {
  progress?: number;
  completed?: number;
  total?: number;
  error?: string;
  controller?: AbortController;
  speed?: number; // download speed in bytes per second
}

interface ModelPullingState {
  pulling: Record<string, PullProgress>;
  startPull: (tag: string, sizeHint?: number) => void;
  cancelPull: (tag: string) => void;
  dismissNotification: (tag: string) => void;
  dismissAllNotifications: () => void;
}

export const useModelPulling = (): ModelPullingState => {
  const [pulling, setPulling] = useState<Record<string, PullProgress>>({});

  const startPull = useCallback((tag: string, sizeHint?: number) => {
    // Don't start if already pulling
    if (pulling[tag]) return;

    const controller = new AbortController();
    
    setPulling(prev => ({
      ...prev,
      [tag]: {
        progress: 0,
        completed: 0,
        total: sizeHint,
        controller,
      }
    }));

    // Start the pull operation
    ollamaService.pullModel(
      tag,
      (progress) => {
        setPulling(prev => ({
          ...prev,
          [tag]: {
            ...prev[tag],
            progress: progress.status === 'success' ? 100 : (progress.completed && progress.total ? (progress.completed / progress.total) * 100 : 0),
            completed: progress.completed,
            total: progress.total,
            speed: progress.speed,
          }
        }));
      },
      controller.signal
    )
    .then(() => {
      // Pull completed successfully
      setPulling(prev => {
        const newPulling = { ...prev };
        delete newPulling[tag];
        return newPulling;
      });
    })
    .catch((error) => {
      if (error.name === 'AbortError') {
        // Pull was cancelled
        setPulling(prev => {
          const newPulling = { ...prev };
          delete newPulling[tag];
          return newPulling;
        });
      } else {
        // Pull failed with error
        setPulling(prev => ({
          ...prev,
          [tag]: {
            ...prev[tag],
            error: error.message || 'Pull failed',
            controller: undefined,
          }
        }));
      }
    });
  }, [pulling]);

  const cancelPull = useCallback((tag: string) => {
    const pullState = pulling[tag];
    if (pullState?.controller) {
      pullState.controller.abort();
    }
    
    setPulling(prev => {
      const newPulling = { ...prev };
      delete newPulling[tag];
      return newPulling;
    });
  }, [pulling]);

  const dismissNotification = useCallback((tag: string) => {
    setPulling(prev => {
      const newPulling = { ...prev };
      delete newPulling[tag];
      return newPulling;
    });
  }, []);

  const dismissAllNotifications = useCallback(() => {
    // Cancel all active pulls
    Object.values(pulling).forEach(pullState => {
      if (pullState.controller) {
        pullState.controller.abort();
      }
    });
    
    setPulling({});
  }, [pulling]);

  return {
    pulling,
    startPull,
    cancelPull,
    dismissNotification,
    dismissAllNotifications,
  };
};
