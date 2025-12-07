import React, { useMemo } from 'react';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { Input } from '../../../components/ui/Input';
import { CatalogItem } from '../../../data/modelCatalog';

/**
 * Formats a pull count number into a human-readable string
 * @param count - The pull count number
 * @returns Formatted string like "5M", "665.1K", "1.2M", or "1,234"
 */
function formatPullCount(count: number | undefined | null): string | null {
  if (count === undefined || count === null || count === 0) return null;
  
  if (count >= 1_000_000_000) {
    const value = count / 1_000_000_000;
    return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)}B`;
  } else if (count >= 1_000_000) {
    const value = count / 1_000_000;
    return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)}M`;
  } else if (count >= 1_000) {
    const value = count / 1_000;
    return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)}K`;
  } else {
    return count.toLocaleString();
  }
}

interface PullProgress {
  progress?: number;
  completed?: number;
  total?: number;
  error?: string;
  controller?: AbortController;
  speed?: number; // download speed in bytes per second
}

interface DiscoverModelsProps {
  catalog: CatalogItem[];
  installed: string[];
  pulling: Record<string, PullProgress>;
  connected: boolean;
  onStartPull: (tag: string, sizeHint?: number) => void;
  onRenderProgress: (tag: string, opts?: { showCancel?: boolean }) => React.ReactNode;
  groupModelsByBaseName: (models: CatalogItem[]) => Record<string, CatalogItem[]>;
  expandedGroups: Set<string>;
  onToggleGroupExpanded: (baseName: string) => void;
  query: string;
  setQuery: (query: string) => void;
  family: string;
  setFamily: (family: string) => void;
  quant: string;
  setQuant: (quant: string) => void;
  resetCounter: number;
  setResetCounter: (counter: number) => void;
  onUpdateCatalog: () => Promise<void>;
  catalogUpdating: boolean;
}

export const DiscoverModels: React.FC<DiscoverModelsProps> = ({
  catalog,
  installed,
  pulling,
  connected,
  onStartPull,
  onRenderProgress,
  groupModelsByBaseName,
  expandedGroups,
  onToggleGroupExpanded,
  query,
  setQuery,
  family,
  setFamily,
  quant,
  setQuant,
  resetCounter,
  setResetCounter,
  onUpdateCatalog,
  catalogUpdating,
}) => {
  // Filter models based on search criteria
  const filteredCatalog = useMemo(() => {
    let filtered = catalog;

    // Filter by search query
    if (query.trim()) {
      const searchLower = query.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        item.tag.toLowerCase().includes(searchLower) ||
        item.family?.toLowerCase().includes(searchLower) ||
        item.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by family
    if (family) {
      filtered = filtered.filter(item => item.family === family);
    }

    // Filter by quantization
    if (quant) {
      filtered = filtered.filter(item => item.quant === quant);
    }

    return filtered;
  }, [catalog, query, family, quant, resetCounter]);

  // Get unique families and quants for filter dropdowns
  const families = useMemo(() => {
    const uniqueFamilies = Array.from(new Set(catalog.map(item => item.family).filter(Boolean)));
    return uniqueFamilies.sort();
  }, [catalog]);

  const quants = useMemo(() => {
    const uniqueQuants = Array.from(new Set(catalog.map(item => item.quant).filter(Boolean)));
    return uniqueQuants.sort();
  }, [catalog]);

  // Group filtered models
  const groupedModels = useMemo(() => {
    return groupModelsByBaseName(filteredCatalog);
  }, [filteredCatalog, groupModelsByBaseName]);

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const clearFilters = () => {
    setQuery('');
    setFamily('');
    setQuant('');
    setResetCounter(resetCounter + 1);
  };

  const hasActiveFilters = query || family || quant;

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or tag"
            aria-label="Search models"
            className="flex-1 p-2 rounded-lg border"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
          />
          <select 
            value={family} 
            onChange={(e) => setFamily(e.target.value)} 
            aria-label="Filter by family" 
            className="p-2 rounded-lg border" 
            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
          >
            <option value="">All Families</option>
            {families.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <select 
            value={quant} 
            onChange={(e) => setQuant(e.target.value)} 
            aria-label="Filter by quantization" 
            className="p-2 rounded-lg border" 
            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
          >
            <option value="">All Quants</option>
            {quants.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
          {hasActiveFilters && (
            <Button variant="secondary" onClick={clearFilters} aria-label="Clear filters">Clear</Button>
          )}
          <Button
            variant="secondary"
            onClick={onUpdateCatalog}
            disabled={catalogUpdating}
            aria-label="Update catalog"
          >
            {catalogUpdating ? 'Updating...' : 'Update Catalog'}
          </Button>
        </div>
      </div>

      {/* Results */}
      <div key={`discover-${resetCounter}`} className="space-y-4">
        {Object.entries(groupedModels).map(([baseName, variants]) => {
          const allInstalled = variants.every(item => installed.includes(item.tag));
          const somePulling = variants.some(item => !!pulling[item.tag]);
          const familyName = variants[0].family;
          const isExpanded = expandedGroups.has(baseName);
          
          // Get the highest pull count from variants (most popular variant)
          const maxPullCount = Math.max(
            ...variants.map(v => v.pull_count || v.pullCount || 0)
          );
          const formattedGroupPullCount = formatPullCount(maxPullCount);
          
          return (
            <div key={baseName} className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div 
                    className="flex items-center gap-2 cursor-pointer mb-2" 
                    onClick={() => onToggleGroupExpanded(baseName)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onToggleGroupExpanded(baseName);
                      }
                    }}
                    aria-expanded={isExpanded}
                    aria-label={`Toggle ${baseName} variants`}
                  >
                    <div className="font-medium text-lg" style={{ color: 'var(--color-text-primary)' }}>{baseName}</div>
                    <Icon className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9,18 15,12 9,6"/>
                      </svg>
                    </Icon>
                  </div>
                  <div className="text-sm mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
                    {familyName && <span className="capitalize">{familyName} family • </span>}
                    {variants.length} variant{variants.length !== 1 ? 's' : ''} available
                    {formattedGroupPullCount && (
                      <span> • {formattedGroupPullCount} pulls</span>
                    )}
                  </div>
                  
                  {isExpanded && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {variants.map(item => {
                        const isInstalled = installed.includes(item.tag);
                        const isPulling = !!pulling[item.tag];
                        const pullState = pulling[item.tag];
                        const buttonText = isInstalled 
                          ? '✓' 
                          : isPulling 
                            ? (pullState?.error ? 'Pull' : 'Pulling…')
                            : 'Pull';
                        
                        return (
                          <div key={item.tag} className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                {item.name}
                              </div>
                              <div className="text-xs text-right" style={{ color: 'var(--color-text-tertiary)' }}>
                                {item.size && `${(item.size/(1024**3)).toFixed(1)} GB`}
                              </div>
                            </div>
                            
                            <div className="text-xs mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                              {item.tag}
                            </div>
                            
                            {onRenderProgress(item.tag, { showCancel: false })}
                            
                            <div className="flex justify-end mt-2">
                              <Button
                                className="px-3 py-1 text-sm"
                                onClick={() => onStartPull(item.tag, item.size)}
                                disabled={isInstalled || (isPulling && !pullState?.error) || !connected}
                                title={!connected ? 'Ollama is not connected.' : (isInstalled ? 'Installed' : (isPulling ? 'Already pulling' : 'Pull model'))}
                                aria-label={isInstalled ? `Installed ${item.tag}` : `Pull ${item.tag}`}
                              >
                                {buttonText}
                              </Button>
                            </div>
                            
                            {pulling[item.tag]?.error && (
                              <div className="text-red-500 text-xs mt-2" role="alert">
                                {pulling[item.tag]?.error} <a className="underline" href="#" onClick={(e) => { e.preventDefault(); onStartPull(item.tag); }}>Retry</a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
