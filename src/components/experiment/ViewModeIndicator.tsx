import React from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

interface ViewModeIndicatorProps {
  isViewingLive: boolean;
  viewTitle?: string;
}

export const ViewModeIndicator: React.FC<ViewModeIndicatorProps> = ({
  isViewingLive,
  viewTitle,
}) => {
  if (isViewingLive) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-green-700/30 border border-green-500/50">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <span className="text-sm font-semibold text-green-300">Live — Following</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-purple-700/30 border border-purple-500/50">
      <Icon className="text-purple-300">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </Icon>
      <span className="text-sm font-semibold text-purple-300">Viewing: {viewTitle || 'Historical Run'}</span>
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
    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mb-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Icon className="text-purple-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </Icon>
          <div>
            <p className="text-purple-200 font-medium">You are viewing <strong>{runTitle}</strong> (not live).</p>
            <p className="text-purple-300 text-sm mt-1">New messages will appear in the Live view.</p>
          </div>
        </div>
        <Button
          onClick={onResumeLive}
          className="bg-green-600 hover:bg-green-700 flex items-center space-x-2 whitespace-nowrap"
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
