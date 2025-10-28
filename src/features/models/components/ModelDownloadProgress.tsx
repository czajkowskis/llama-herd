import React from 'react';
import { Button } from '../../../components/ui/Button';
import { usePullTasks } from '../../../hooks/usePullTasks';
import { ollamaService } from '../../../services/ollamaService';

interface ModelDownloadProgressProps {
  tag: string;
  pulling: { [key: string]: any };
  startPull: (tag: string, sizeHint?: number) => void;
  cancelPull: (tag: string) => void;
  dismissNotification: (tag: string) => void;
  showCancel?: boolean;
}

export const ModelDownloadProgress: React.FC<ModelDownloadProgressProps> = ({
  tag,
  pulling,
  startPull,
  cancelPull,
  dismissNotification,
  showCancel = true,
}) => {
  const { pullTasks, dismissTask } = usePullTasks();
  const p = pulling[tag];

  if (!p) return null;

  const aria: any = p.progress !== undefined ? { 'aria-valuenow': p.progress, 'aria-valuemin': 0, 'aria-valuemax': 100 } : {};
  const hasActiveController = !!p.controller;
  const hasServerTask = Object.values(pullTasks).some((t: any) => t.model_name === tag && (t.status === 'running' || t.status === 'pending'));

  return (
    <div className="mt-2">
      <div role="progressbar" {...aria} className="w-full h-2 bg-gray-700 rounded-full overflow-hidden" aria-label={`Downloading ${tag}`}>
        <div className="h-2 bg-purple-600 transition-all" style={{ width: `${p.progress ?? 0}%` }} />
      </div>
      <div className="flex justify-between items-center mt-1 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        <span aria-live="polite">{p.progress !== undefined ? `${p.progress}%` : 'Downloading'}</span>
      </div>
      <span className="sr-only" aria-live="polite">{p.progress !== undefined ? `${p.progress}% complete` : 'Downloading'}</span>
      {showCancel && (
        <div className="flex items-center gap-2 mt-2">
          {(hasActiveController || hasServerTask) && <Button variant="secondary" onClick={() => cancelPull(tag)} aria-label={`Cancel ${tag}`}>Cancel</Button>}
          {p.error && (
            <span className="text-red-500 text-sm" role="alert">
              {p.error}{' '}
              <button className="underline" onClick={() => startPull(tag)}>Retry</button>
              {' '}
              <button
                className="underline ml-2"
                onClick={async () => {
                  try {
                    const serverTask = Object.values(pullTasks).find((t: any) => t.model_name === tag && t.error) as any | undefined;
                    if (serverTask && (serverTask.task_id || serverTask.id)) {
                      try {
                        await ollamaService.dismissPullTask(serverTask.task_id || serverTask.id);
                      } catch (e) {
                        console.warn('Server dismiss failed, falling back to local dismiss', e);
                        try { dismissTask(serverTask.task_id || serverTask.id); } catch (_) {}
                      }
                    } else {
                      dismissNotification(tag);
                    }
                  } catch (e) {
                    // ignore errors
                  }
                }}
              >Dismiss</button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
