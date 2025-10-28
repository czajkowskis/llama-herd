import React from 'react';
import { Button } from '../ui/Button';
import { ModelProgressBar } from './ModelProgressBar';

interface PullingState {
  progress?: number;
  error?: string;
  controller?: AbortController;
}

interface ActiveDownloadsPanelProps {
  pulling: Record<string, PullingState>;
  onCancelPull: (tag: string) => void;
  onDismissAllNotifications: () => void;
}

/**
 * Panel component showing active model downloads with progress bars
 */
export const ActiveDownloadsPanel: React.FC<ActiveDownloadsPanelProps> = ({
  pulling,
  onCancelPull,
  onDismissAllNotifications
}) => {
  const tags = Object.keys(pulling);
  if (tags.length === 0) return null;
  
  const hasErrors = Object.values(pulling).some(p => !!p.error);
  
  return (
    <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Active downloads</div>
        {hasErrors && (
          <div>
            <Button 
              variant="secondary" 
              onClick={onDismissAllNotifications} 
              className="text-xs"
            >
              Clear errors
            </Button>
          </div>
        )}
      </div>
      <div className="space-y-3">
        {tags.map(tag => {
          const pullState = pulling[tag];
          return (
            <div key={tag}>
              <div className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{tag}</div>
              <ModelProgressBar
                tag={tag}
                progress={pullState.progress}
                hasActiveController={!!pullState.controller}
                onCancel={onCancelPull}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
