import React from 'react';

type TabKey = 'installed' | 'discover';

interface ModelTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

/**
 * Tab navigation component for models page
 */
export const ModelTabs: React.FC<ModelTabsProps> = ({
  activeTab,
  onTabChange
}) => {
  const keys: TabKey[] = ['installed', 'discover'];
  
  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    const idx = keys.indexOf(activeTab);
    console.debug('Tabs onKeyDown', e.key, 'activeIndex', idx);
    
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onTabChange(keys[(idx + 1) % keys.length]);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onTabChange(keys[(idx - 1 + keys.length) % keys.length]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onTabChange(keys[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      onTabChange(keys[keys.length - 1]);
    }
  };

  const handleSetActive = (key: TabKey) => {
    try {
      console.debug('Tabs handleSetActive', key);
    } catch (e) {
      // ignore
    }
    onTabChange(key);
  };

  return (
    <div
      className="flex items-center gap-2 border-b border-gray-700 mb-4"
      role="tablist"
      aria-label="Models sections"
      onKeyDown={onKeyDown}
    >
      {keys.map(key => (
        <button
          key={key}
          role="tab"
          type="button"
          id={`tab-${key}`}
          aria-controls={`panel-${key}`}
          aria-selected={activeTab === key}
          className={`px-4 py-2 ${activeTab === key ? 'border-b-2 border-purple-600 text-purple-400' : ''}`}
          onClick={() => handleSetActive(key)}
        >
          {key === 'installed' ? 'Installed' : 'Discover'}
        </button>
      ))}
    </div>
  );
};
