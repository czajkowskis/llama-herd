import React from 'react';
import { Icon } from './Icon';

interface PullNotificationProps {
  activePulls: Array<{
    task_id: string;
    model_name: string;
    status: string;
    progress?: {
      status?: string;
      total?: number;
      completed?: number;
    };
  }>;
  className?: string;
}

export const PullNotification: React.FC<PullNotificationProps> = ({
  activePulls,
  className = '',
}) => {
  // Debug logging
  console.log('PullNotification activePulls:', activePulls);

  if (activePulls.length === 0) {
    return null;
  }

  const runningPulls = activePulls.filter(pull => pull.status === 'running');
  const pendingPulls = activePulls.filter(pull => pull.status === 'pending');

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <Icon className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </Icon>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Model Download in Progress
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p className="mb-2">
              Ollama is currently downloading models. Other operations may be slower or unavailable until the download completes.
            </p>

            {runningPulls.length > 0 && (
              <div className="space-y-1">
                <p className="font-medium">Downloading:</p>
                {runningPulls.map(pull => (
                  <div key={pull.task_id} className="flex items-center justify-between">
                    <span className="text-xs">{pull.model_name}</span>
                    {pull.progress?.total && pull.progress?.completed && (
                      <span className="text-xs text-yellow-600">
                        {(() => {
                          const percentage = Math.round((pull.progress!.completed / pull.progress!.total) * 100);
                          console.log(`Progress for ${pull.model_name}: ${pull.progress!.completed}/${pull.progress!.total} = ${percentage}%`);
                          return `${percentage}%`;
                        })()}
                      </span>
                    )}
                    {!pull.progress?.total && !pull.progress?.completed && pull.progress && (
                      <span className="text-xs text-yellow-600">
                        {pull.progress.status || 'Starting...'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {pendingPulls.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="font-medium">Queued:</p>
                {pendingPulls.map(pull => (
                  <div key={pull.task_id} className="text-xs">
                    {pull.model_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};