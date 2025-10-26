import React, { useState, useEffect, useRef } from 'react';
import { Conversation } from '../../../types/index.d';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';

interface RunSelectorProps {
  completedConversations: Conversation[];
  selectedConversation: Conversation | null;
  isViewingLive: boolean;
  status: string;
  liveConversation: Conversation | null;
  onSelectRun: (conversation: Conversation | null, isLive: boolean) => void;
  totalIterations: number;
  currentIteration: number;
}

interface RunPreview {
  conversation: Conversation;
  isPinned: boolean;
}

const STORAGE_KEY = 'llama-herd-pinned-runs';

// Helper functions for pinned runs persistence
const getPinnedRuns = (experimentId?: string): Set<string> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const allPinned = JSON.parse(stored) as Record<string, string[]>;
      if (experimentId && allPinned[experimentId]) {
        return new Set(allPinned[experimentId]);
      }
    }
  } catch (e) {
    console.error('Failed to load pinned runs:', e);
  }
  return new Set();
};

const savePinnedRuns = (experimentId: string, pinnedIds: Set<string>) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const allPinned = stored ? JSON.parse(stored) : {};
    allPinned[experimentId] = Array.from(pinnedIds);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allPinned));
  } catch (e) {
    console.error('Failed to save pinned runs:', e);
  }
};

const formatTimestamp = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
};

export const RunSelector: React.FC<RunSelectorProps> = ({
  completedConversations,
  selectedConversation,
  isViewingLive,
  status,
  liveConversation,
  onSelectRun,
  totalIterations,
  currentIteration,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedRuns, setPinnedRuns] = useState<Set<string>>(new Set());
  const [hoveredRunId, setHoveredRunId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Get experiment ID from any conversation
  const experimentId = completedConversations[0]?.experiment_id || liveConversation?.experiment_id;

  // Load pinned runs on mount
  useEffect(() => {
    if (experimentId) {
      setPinnedRuns(getPinnedRuns(experimentId));
    }
  }, [experimentId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [isDropdownOpen]);

  const togglePin = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!experimentId) return;

    const newPinned = new Set(pinnedRuns);
    if (newPinned.has(conversationId)) {
      newPinned.delete(conversationId);
    } else {
      newPinned.add(conversationId);
    }
    setPinnedRuns(newPinned);
    savePinnedRuns(experimentId, newPinned);
  };

  // Filter and sort conversations
  const getFilteredAndSortedRuns = (): RunPreview[] => {
    let filtered = completedConversations;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => 
        conv.title.toLowerCase().includes(query) ||
        formatTimestamp(conv.createdAt).toLowerCase().includes(query)
      );
    }

    // Create run previews with pinned status
    const previews: RunPreview[] = filtered.map(conv => ({
      conversation: conv,
      isPinned: pinnedRuns.has(conv.id),
    }));

    // Sort: pinned first, then by creation time (newest first)
    previews.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.conversation.createdAt).getTime() - new Date(a.conversation.createdAt).getTime();
    });

    return previews;
  };

  const filteredRuns = getFilteredAndSortedRuns();

  const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-yellow-500 text-black">{part}</mark>
        : part
    );
  };

  const getPreviewMessages = (conv: Conversation): string => {
    const firstTwo = conv.messages.slice(0, 2);
    return firstTwo.map(msg => {
      const agent = conv.agents.find(a => a.id === msg.agentId);
      const preview = msg.content.slice(0, 100);
      return `${agent?.name || 'Unknown'}: ${preview}${msg.content.length > 100 ? '...' : ''}`;
    }).join('\n');
  };

  return (
    <div className="mb-4 flex items-center space-x-4">
      {/* Iteration progress display */}
      <div className="flex items-center space-x-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
        <Icon className="text-purple-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-repeat">
            <path d="m17 2 4 4-4 4"/>
            <path d="M3 11v-1a4 4 0 0 1 4-4h14"/>
            <path d="m7 22-4-4 4-4"/>
            <path d="M21 13v1a4 4 0 0 1-4 4H3"/>
          </svg>
        </Icon>
        <span className="text-sm font-medium">
          Iteration {currentIteration} of {totalIterations}
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Browse runs:</span>
      
      {/* In progress indicator */}
      {completedConversations.length === 0 && status === 'running' && (
        <button 
          className="px-3 py-1 rounded text-sm cursor-default" 
          style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}
          disabled
        >
          Iteration {currentIteration} of {totalIterations} (in progress)
        </button>
      )}

      {/* Dropdown for completed runs */}
      {completedConversations.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="px-3 py-1 rounded text-sm flex items-center space-x-1 hover:opacity-80 transition-opacity"
            style={{ 
              backgroundColor: 'var(--color-bg-tertiary)', 
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)'
            }}
          >
            <span>
              {!isViewingLive && selectedConversation 
                ? `${selectedConversation.title}`
                : `Runs (${completedConversations.length})`
              }
            </span>
            <svg 
              className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {isDropdownOpen && (
            <div 
              className="absolute top-full left-0 mt-2 w-96 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col"
              style={{ 
                backgroundColor: 'var(--color-bg-secondary)', 
                border: '1px solid var(--color-border)' 
              }}
            >
              {/* Search input */}
              <div className="p-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <input
                  type="text"
                  placeholder="Search by title or timestamp..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                  style={{ 
                    backgroundColor: 'var(--color-bg-tertiary)', 
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-accent)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--color-border)';
                  }}
                  autoFocus
                />
              </div>

              {/* Runs list */}
              <div className="overflow-y-auto flex-1">
                {filteredRuns.length === 0 ? (
                  <div className="p-4 text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                    No runs found
                  </div>
                ) : (
                  filteredRuns.map((runPreview, index) => {
                    const conv = runPreview.conversation;
                    const isSelected = !isViewingLive && selectedConversation?.id === conv.id;
                    
                    return (
                      <div
                        key={conv.id}
                        className="relative flex items-center px-3 py-2 cursor-pointer transition-colors"
                        style={{
                          backgroundColor: isSelected ? 'rgba(107, 70, 193, 0.1)' : 'transparent',
                          color: 'var(--color-text-primary)',
                          borderBottom: '1px solid var(--color-border)'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                          }
                          setHoveredRunId(conv.id);
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                          setHoveredRunId(null);
                        }}
                        onClick={() => {
                          onSelectRun(conv, false);
                          setIsDropdownOpen(false);
                        }}
                      >
                        {/* Pin button */}
                        <button
                          onClick={(e) => togglePin(conv.id, e)}
                          className="mr-2 p-1 rounded transition-colors"
                          style={{ 
                            color: runPreview.isPinned ? '#fbbf24' : 'var(--color-text-tertiary)',
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title={runPreview.isPinned ? 'Unpin run' : 'Pin run'}
                        >
                          <svg className="w-4 h-4" fill={runPreview.isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>

                        {/* Run info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline space-x-2">
                            <span className="font-medium text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                              {highlightMatch(conv.title, searchQuery)}
                            </span>
                            {isSelected && (
                              <span className="text-xs" style={{ color: 'var(--color-accent)' }}>●</span>
                            )}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                            {highlightMatch(formatTimestamp(conv.createdAt), searchQuery)}
                          </div>
                        </div>

                        {/* Message count */}
                        <div className="ml-2 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                          {conv.messages.length} msg{conv.messages.length !== 1 ? 's' : ''}
                        </div>

                        {/* Tooltip preview */}
                        {hoveredRunId === conv.id && conv.messages.length > 0 && (
                          <div 
                            className="absolute left-full top-0 ml-2 w-80 rounded-lg shadow-xl p-3 z-50 pointer-events-none"
                            style={{ 
                              backgroundColor: 'var(--color-bg-primary)', 
                              border: '1px solid var(--color-border)' 
                            }}
                          >
                            <div className="text-xs whitespace-pre-wrap max-h-32 overflow-hidden" style={{ color: 'var(--color-text-secondary)' }}>
                              {getPreviewMessages(conv)}
                            </div>
                            {conv.messages.length > 2 && (
                              <div className="text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
                                +{conv.messages.length - 2} more messages...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer with count */}
              <div 
                className="p-2 text-xs text-center"
                style={{ 
                  borderTop: '1px solid var(--color-border)', 
                  backgroundColor: 'var(--color-bg-tertiary)', 
                  color: 'var(--color-text-tertiary)' 
                }}
              >
                {filteredRuns.length} of {completedConversations.length} runs
                {pinnedRuns.size > 0 && ` • ${pinnedRuns.size} pinned`}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};
