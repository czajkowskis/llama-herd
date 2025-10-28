import React from 'react';
import { Button } from '../ui/Button';

interface ModelProgressBarProps {
  tag: string;
  progress?: number;
  showCancel?: boolean;
  hasActiveController?: boolean;
  hasServerTask?: boolean;
  onCancel: (tag: string) => void;
}

/**
 * Reusable progress bar component for model downloads
 */
export const ModelProgressBar: React.FC<ModelProgressBarProps> = ({
  tag,
  progress,
  showCancel = true,
  hasActiveController = false,
  hasServerTask = false,
  onCancel
}) => {
  const aria: any = progress !== undefined ? { 'aria-valuenow': progress, 'aria-valuemin': 0, 'aria-valuemax': 100 } : {};
  
  return (
    <div className="mt-2">
      <div role="progressbar" {...aria} className="w-full h-2 bg-gray-700 rounded-full overflow-hidden" aria-label={`Downloading ${tag}`}>
        <div className="h-2 bg-purple-600 transition-all" style={{ width: `${progress ?? 0}%` }} />
      </div>
      <div className="flex justify-between items-center mt-1 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        <span aria-live="polite">{progress !== undefined ? `${progress}%` : 'Downloading'}</span>
      </div>
      <span className="sr-only" aria-live="polite">{progress !== undefined ? `${progress}% complete` : 'Downloading'}</span>
      {showCancel && (
        <div className="flex items-center gap-2 mt-2">
          {(hasActiveController || hasServerTask) && (
            <Button 
              variant="secondary" 
              onClick={() => onCancel(tag)} 
              aria-label={`Cancel ${tag}`}
            >
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
