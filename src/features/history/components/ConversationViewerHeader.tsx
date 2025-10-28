import React from 'react';
import { Icon } from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';

interface ConversationViewerHeaderProps {
  conversationsCount: number;
  showUploadInterface: boolean;
  onToggleUploadInterface: () => void;
}

export const ConversationViewerHeader: React.FC<ConversationViewerHeaderProps> = ({
  conversationsCount,
  showUploadInterface,
  onToggleUploadInterface,
}) => {
  return (
    <div className="flex items-center space-x-4 mb-6">
      <div className="flex items-center space-x-3">
        <Icon className="text-purple-400 text-xl">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
        </Icon>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Conversation Viewer
        </h2>
      </div>
      {conversationsCount > 0 && !showUploadInterface && (
        <Button 
          onClick={onToggleUploadInterface}
          className="bg-purple-600 hover:bg-purple-700 text-sm px-3 py-1 flex items-center"
        >
          <Icon className="mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
              <path d="M5 12h14"/>
              <path d="M12 5v14"/>
            </svg>
          </Icon>
          Add Conversation
        </Button>
      )}
      {conversationsCount > 0 && showUploadInterface && (
        <Button 
          onClick={onToggleUploadInterface}
          className="bg-gray-600 hover:bg-gray-700 text-sm px-3 py-1 flex items-center"
        >
          <Icon className="mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
          </Icon>
          Back to Conversations
        </Button>
      )}
    </div>
  );
};
