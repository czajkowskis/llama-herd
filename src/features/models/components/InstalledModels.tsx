import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { CatalogItem } from '../../../data/modelCatalog';

interface InstalledModelsProps {
  installed: string[];
  defaultModel: string;
  onSetDefaultModel: (model: string) => void;
  onRemoveModel: (model: string) => void;
  catalog: CatalogItem[];
  deriveModelName: (tag: string) => string;
}

export const InstalledModels: React.FC<InstalledModelsProps> = ({
  installed,
  defaultModel,
  onSetDefaultModel,
  onRemoveModel,
  catalog,
  deriveModelName,
}) => {
  if (installed.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No local models found.</p>
    );
  }

  return (
    <div className="space-y-3">
      {installed.map(tag => {
        const catalogItem = catalog.find(c => c.tag === tag);
        const displayName = catalogItem?.name || deriveModelName(tag);
        const isDefault = defaultModel === tag;
        
        return (
          <div
            key={tag}
            className="p-3 rounded-xl group"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{displayName}</div>
                {displayName !== tag && (
                  <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{tag}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant={isDefault ? 'primary' : 'secondary'} onClick={() => onSetDefaultModel(tag)} aria-label={`Set ${tag} as default`}>
                  {isDefault ? 'Default' : 'Set default'}
                </Button>
                <button
                  onClick={() => onRemoveModel(tag)}
                  aria-label={`Remove ${tag}`}
                  title="Remove"
                  className="p-1 rounded transition-colors duration-150 text-white hover:text-red-400 hover:bg-red-500/20 focus:opacity-100 flex items-center"
                >
                  <Icon>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-current">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                    </svg>
                  </Icon>
                  <span className="sr-only">Remove</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
