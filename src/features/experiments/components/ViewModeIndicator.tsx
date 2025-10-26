import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';

interface ViewModeIndicatorProps {
  isViewingLive: boolean;
  viewTitle?: string;
  onResumeLive?: () => void;
}

export const ViewModeIndicator: React.FC<ViewModeIndicatorProps> = ({
  isViewingLive,
  viewTitle,
  onResumeLive,
}) => {
  if (isViewingLive) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 rounded-full border" style={{ backgroundColor: 'var(--color-success-bg)', borderColor: 'var(--color-success)', color: 'var(--color-success-text)' }}>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-success)' }}></div>
        <span className="text-sm font-semibold">Live — Following</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2 px-4 py-2 rounded-full border" style={{ backgroundColor: 'rgba(107, 70, 193, 0.1)', borderColor: 'var(--color-accent)', color: 'var(--color-text-primary)' }}>
        <Icon className="text-purple-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </Icon>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Viewing: {viewTitle || 'Historical Run'}</span>
      </div>
      {onResumeLive && (
        <Button
          onClick={onResumeLive}
          className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: 'var(--color-success)', color: 'white' }}
        >
          Resume Live
        </Button>
      )}
    </div>
  );
};

interface HistoricalViewBannerProps {
  runTitle: string;
  onResumeLive: () => void;
}

export const HistoricalViewBanner: React.FC<HistoricalViewBannerProps> = ({
  runTitle,
  onResumeLive,
}) => {
  return (
    <div className="border rounded-lg p-4 mb-4 animate-fade-in-up" style={{ backgroundColor: 'rgba(107, 70, 193, 0.1)', borderColor: 'var(--color-accent)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Icon className="text-purple-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </Icon>
          <div>
            <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>You are viewing <strong>{runTitle}</strong> (not live).</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>New messages will appear in the Live view.</p>
          </div>
        </div>
        <Button
          onClick={onResumeLive}
          className="flex items-center space-x-2 whitespace-nowrap" style={{ backgroundColor: 'var(--color-success)', color: 'white' }}
        >
          <Icon>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="5 12 5 5 12 12 5 19 5 12"/>
              <line x1="19" y1="5" x2="19" y2="19"/>
            </svg>
          </Icon>
          <span>Resume Live</span>
        </Button>
      </div>
    </div>
  );
};
