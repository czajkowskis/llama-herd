import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ollamaService, PullTask } from '../services/ollamaService';
import { buildWebSocketUrl } from '../config';

// LocalStorage keys and helpers for caching pull tasks and dismissed IDs
const LS_KEY = 'pull_tasks_cache_v1';
const LS_DISMISSED = 'pull_tasks_dismissed_v1';

function loadLocalTasks(): Record<string, PullTask> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PullTask>;
    return parsed || {};
  } catch (e) {
    console.warn('Failed to load pull tasks from localStorage', e);
    return {};
  }
}

function saveLocalTasks(map: Record<string, PullTask>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('Failed to save pull tasks to localStorage', e);
  }
}

function loadDismissed(): string[] {
  try {
    const raw = localStorage.getItem(LS_DISMISSED);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return parsed || [];
  } catch (e) {
    console.warn('Failed to load dismissed pull tasks from localStorage', e);
    return [];
  }
}

function saveDismissed(ids: string[]) {
  try {
    localStorage.setItem(LS_DISMISSED, JSON.stringify(ids));
  } catch (e) {
    console.warn('Failed to save dismissed pull tasks to localStorage', e);
  }
}

interface PullTasksContextType {
  pullTasks: Record<string, PullTask>;
  hasActivePulls: boolean;
  activePulls: PullTask[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  // Dismiss helpers: persist dismissed task ids so notifications don't reappear
  dismissedIds: Set<string>;
  dismissTask: (taskId: string) => void;
  dismissByModelName: (modelName: string) => void;
  dismissAllErrors: () => void;
}

const PullTasksContext = createContext<PullTasksContextType | undefined>(undefined);

export const PullTasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from localStorage for instant UI state, then reconcile with server
  const [pullTasks, setPullTasks] = useState<Record<string, PullTask>>(() => loadLocalTasks());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set(loadDismissed()));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const webSocketsRef = useRef<Record<string, WebSocket>>({});

  const updatePullTask = useCallback((taskId: string, updates: Partial<PullTask>) => {
    setPullTasks(prev => {
      const currentTask = prev[taskId];
      if (!currentTask) return prev;

      return {
        ...prev,
        [taskId]: { ...currentTask, ...updates }
      };
    });
  }, []);

  // Persist to localStorage whenever tasks change
  useEffect(() => {
    try {
      saveLocalTasks(pullTasks);
    } catch (e) {
      // saveLocalTasks handles logging
    }
  }, [pullTasks]);

  // Persist dismissed IDs whenever they change
  useEffect(() => {
    try {
      saveDismissed(Array.from(dismissedIds));
    } catch (e) {
      // handled above
    }
  }, [dismissedIds]);

  // Listen for localStorage changes from other tabs/windows and merge them
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === LS_KEY) {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) as Record<string, PullTask> : {};
          setPullTasks(prev => ({ ...prev, ...parsed }));
        } catch (err) {
          console.warn('Failed to parse pull tasks from storage event', err);
        }
      } else if (e.key === LS_DISMISSED) {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) as string[] : [];
          setDismissedIds(new Set(parsed || []));
        } catch (err) {
          console.warn('Failed to parse dismissed ids from storage event', err);
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const connectWebSocket = useCallback((taskId: string) => {
    // Close existing connection if any
    if (webSocketsRef.current[taskId]) {
      webSocketsRef.current[taskId].close();
    }

    const wsUrl = buildWebSocketUrl(`/api/models/ws/pull/${taskId}`);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`Connected to pull progress WebSocket for task ${taskId}`);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket message received:', message);

        if (message.type === 'progress' && message.data) {
          // Update progress immediately
          console.log('Updating progress for task', taskId, 'with data:', message.data);
          updatePullTask(taskId, { progress: message.data });
        } else if (message.type === 'status' && message.data) {
          const status = message.data;
          console.log('Updating status for task', taskId, 'with data:', status);
          // Update status and other fields
          updatePullTask(taskId, {
            status: status.status,
            progress: status.progress,
            error: status.error,
            started_at: status.started_at,
            completed_at: status.completed_at
          });

          // Close WebSocket if task is completed
          if (status.status === 'completed' || status.status === 'error' || status.status === 'cancelled') {
            ws.close();
            delete webSocketsRef.current[taskId];
          }
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', event.data, error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error for task', taskId, error);
    };

    ws.onclose = () => {
      console.log(`WebSocket closed for task ${taskId}`);
      delete webSocketsRef.current[taskId];
    };

    webSocketsRef.current[taskId] = ws;
  }, [updatePullTask]);

  const disconnectWebSocket = useCallback((taskId: string) => {
    if (webSocketsRef.current[taskId]) {
      webSocketsRef.current[taskId].close();
      delete webSocketsRef.current[taskId];
    }
  }, []);

  const fetchPullTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const serverTasks = await ollamaService.getPullTasks();

      // Merge serverTasks with local cache: server wins on conflicts
      setPullTasks(prevLocal => {
        const merged: Record<string, PullTask> = { ...prevLocal };
        // Put/replace entries from server, but skip dismissed IDs
        Object.values(serverTasks).forEach((t: any) => {
          const id = t.task_id || t.id;
          if (!id) return;
          if (dismissedIds.has(id)) return; // skip tasks user dismissed
          merged[id] = t;
        });
        return merged;
      });

      // Connect WebSockets for active tasks
      // Ensure websockets are connected for active tasks (use serverTasks as authoritative)
      Object.values(serverTasks).forEach((task: any) => {
        const id = task.task_id || task.id;
        if (!id) return;
        if (dismissedIds.has(id)) {
          // ensure dismissed tasks are not kept around
          disconnectWebSocket(id);
          return;
        }

        if ((task.status === 'running' || task.status === 'pending') && !webSocketsRef.current[id]) {
          connectWebSocket(id);
        } else if (task.status !== 'running' && task.status !== 'pending') {
          disconnectWebSocket(id);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pull tasks');
    } finally {
      setIsLoading(false);
    }
  }, [connectWebSocket, disconnectWebSocket]);

  // Dismiss helpers: mark a task id (server-persisted) as dismissed so it won't reappear
  const dismissTask = useCallback((taskId: string) => {
    setDismissedIds(prev => {
      if (prev.has(taskId)) return prev;
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
    // Remove from in-memory tasks and close websocket
    setPullTasks(prev => {
      if (!prev[taskId]) return prev;
      const { [taskId]: _, ...rest } = prev;
      return rest;
    });
    disconnectWebSocket(taskId);
  }, [disconnectWebSocket]);

  const dismissByModelName = useCallback((modelName: string) => {
    // Find matching task ids and dismiss them
    Object.entries(pullTasks).forEach(([id, t]) => {
      if (t.model_name === modelName) {
        dismissTask(id);
      }
    });
  }, [pullTasks, dismissTask]);

  const dismissAllErrors = useCallback(() => {
    Object.entries(pullTasks).forEach(([id, t]) => {
      if (t.error) {
        dismissTask(id);
      }
    });
  }, [pullTasks, dismissTask]);

  // Check if there are any active pulls (running or pending)
  const hasActivePulls = Object.values(pullTasks).some(task =>
    task.status === 'running' || task.status === 'pending'
  );

  // Get active pulls
  const activePulls = Object.values(pullTasks).filter(task =>
    task.status === 'running' || task.status === 'pending'
  );

  // Debug logging
  console.log('PullTasksContext activePulls:', activePulls);

  useEffect(() => {
    // Initial fetch
    fetchPullTasks();

    // Poll every 5 seconds - always poll to catch new pulls that start
    // while user is on other pages
    const interval = setInterval(() => {
      fetchPullTasks();
    }, 5000);

    return () => {
      clearInterval(interval);
      // Clean up all WebSocket connections
      Object.keys(webSocketsRef.current).forEach(taskId => {
        webSocketsRef.current[taskId].close();
      });
      webSocketsRef.current = {};
    };
  }, [fetchPullTasks]);

  const value: PullTasksContextType = {
    pullTasks,
    hasActivePulls,
    activePulls,
    isLoading,
    error,
    refetch: fetchPullTasks,
    dismissedIds,
    dismissTask,
    dismissByModelName,
    dismissAllErrors,
  };

  return (
    <PullTasksContext.Provider value={value}>
      {children}
    </PullTasksContext.Provider>
  );
};

export const usePullTasks = (): PullTasksContextType => {
  const context = useContext(PullTasksContext);
  if (context === undefined) {
    throw new Error('usePullTasks must be used within a PullTasksProvider');
  }
  return context;
};