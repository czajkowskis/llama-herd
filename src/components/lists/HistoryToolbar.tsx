import React from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

interface HistoryToolbarProps {
  activeTab: 'experiments' | 'conversations';
  experimentsCount: number;
  conversationsCount: number;
  selectMode: boolean;
  selectedCount: number;
  onTabChange: (tab: 'experiments' | 'conversations') => void;
  onToggleSelectMode: () => void;
  onSelectAll: () => void;
  onBulkDelete: () => void;
  onAddConversation: () => void;
}

/**
 * Toolbar component for history page with tabs and selection controls
 */
export const HistoryToolbar: React.FC<HistoryToolbarProps> = ({
  activeTab,
  experimentsCount,
  conversationsCount,
  selectMode,
  selectedCount,
  onTabChange,
  onToggleSelectMode,
  onSelectAll,
  onBulkDelete,
  onAddConversation,
}) => {
  const totalCount = activeTab === 'experiments' ? experimentsCount : conversationsCount;
  const isAllSelected = selectedCount === totalCount;

  const tabs = [
    { name: 'Experiments', count: experimentsCount, value: 'experiments' },
    { name: 'Conversations', count: conversationsCount, value: 'conversations' },
  ];

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>History</h1>
      <div className="flex items-center space-x-4">
        {selectMode && (
          <div className="flex items-center space-x-2">
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {selectedCount} selected
            </span>
            <Button
              onClick={onSelectAll}
              variant="secondary"
            >
              {isAllSelected ? 'Clear All' : 'Select All'}
            </Button>
            <Button
              onClick={onBulkDelete}
              disabled={selectedCount === 0}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Selected ({selectedCount})
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {activeTab === 'conversations' && !selectMode && (
          <Button
            onClick={onAddConversation}
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
        <Button onClick={onToggleSelectMode} variant={selectMode ? "primary" : "secondary"}>
          {selectMode ? 'Cancel' : 'Select'}
        </Button>
        <div className="flex space-x-2">
          <button
            onClick={() => onTabChange('experiments')}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: activeTab === 'experiments' ? '#9333ea' : 'var(--color-bg-tertiary)',
              color: activeTab === 'experiments' ? 'white' : 'var(--color-text-secondary)'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'experiments') {
                e.currentTarget.style.backgroundColor = 'var(--color-border)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'experiments') {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              }
            }}
          >
            Experiments ({experimentsCount})
          </button>
          <button
            onClick={() => onTabChange('conversations')}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: activeTab === 'conversations' ? '#9333ea' : 'var(--color-bg-tertiary)',
              color: activeTab === 'conversations' ? 'white' : 'var(--color-text-secondary)'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'conversations') {
                e.currentTarget.style.backgroundColor = 'var(--color-border)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'conversations') {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              }
            }}
          >
            Conversations ({conversationsCount})
          </button>
        </div>
      </div>
    </div>
  );
};
