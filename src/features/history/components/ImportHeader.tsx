import React from 'react';
import { Icon } from '../../../components/ui/Icon';

interface ImportHeaderProps {
  conversationsCount: number;
}

export const ImportHeader: React.FC<ImportHeaderProps> = ({
  conversationsCount,
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
          Import Conversations
        </h2>
      </div>
    </div>
  );
};
