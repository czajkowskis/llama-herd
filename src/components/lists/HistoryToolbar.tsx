import React from 'react';
import { Button } from '../ui/Button';

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
  onBulkDelete
}) => {
  const totalCount = activeTab === 'experiments' ? experimentsCount : conversationsCount;
  const isAllSelected = selectedCount === totalCount;

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
        <button
          onClick={onToggleSelectMode}
          className="px-3 py-2 rounded-lg font-medium transition-colors"
          style={{
            backgroundColor: selectMode ? '#dc2626' : 'var(--color-bg-tertiary)',
            color: selectMode ? 'white' : 'var(--color-text-secondary)'
          }}
          title={selectMode ? 'Exit selection mode' : 'Enter selection mode'}
        >
          {selectMode ? 'Cancel' : 'Select'}
        </button>
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
