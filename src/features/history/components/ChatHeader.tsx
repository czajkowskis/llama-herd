import React from 'react';
import { Icon } from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';

interface ChatHeaderProps {
  conversationTitle: string;
  onShowExportPanel: () => void;
  onBackToList: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversationTitle,
  onShowExportPanel,
  onBackToList,
}) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-3">
        <Icon className="text-purple-400 text-xl">
          <svg xmlns="http://www.w.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
        </Icon>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{conversationTitle}</h2>
      </div>
      <div className="flex space-x-3">
        <Button 
          onClick={onShowExportPanel}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Icon className="mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </Icon>
          Export
        </Button>
        <Button 
          onClick={onBackToList}
          className="bg-gray-600 hover:bg-gray-700"
        >
          Back to List
        </Button>
      </div>
    </div>
  );
};
