import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ollamaService } from '../services/ollamaService';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';

type TabKey = 'installed' | 'discover';

type CatalogItem = {
  name: string;
  tag: string; // e.g., "llama3:8b-instruct-q4_0"
  size?: number; // bytes
  family?: string; // llama|mistral|codellama
  quant?: string; // q4_0|q5_1|fp16
  notes?: string;
};

type PullingState = {
  progress?: number;
  total?: number;
  error?: string;
  controller?: AbortController; // Not persisted, recreated on mount
};

const SIZE_CONFIRM_THRESHOLD = 2 * 1024 * 1024 * 1024; // 2GB
const PULLING_STATE_KEY = 'llama-herd-pulling-models';

// Helper to save pulling state to localStorage (without controllers)
const savePullingState = (state: Record<string, PullingState>) => {
  const persistable: Record<string, Omit<PullingState, 'controller'>> = {};
  Object.entries(state).forEach(([tag, data]) => {
    persistable[tag] = {
      progress: data.progress,
      total: data.total,
      error: data.error,
    };
  });
  localStorage.setItem(PULLING_STATE_KEY, JSON.stringify(persistable));
};

// Helper to load pulling state from localStorage
const loadPullingState = (): Record<string, PullingState> => {
  try {
    const saved = localStorage.getItem(PULLING_STATE_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    // Convert back to PullingState format (controllers will be added when needed)
    const state: Record<string, PullingState> = {};
    Object.entries(parsed).forEach(([tag, data]: [string, any]) => {
      state[tag] = {
        progress: data.progress,
        total: data.total,
        error: data.error,
      };
    });
    return state;
  } catch (e) {
    console.error('Failed to load pulling state:', e);
    return {};
  }
};

export const Models: React.FC = () => {
  const [active, setActive] = useState<TabKey>('installed');
  const [installed, setInstalled] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState<string>(() => localStorage.getItem('llama-herd-default-ollama-model') || '');
  const [connected, setConnected] = useState<boolean>(false);
  const [version, setVersion] = useState<string>('');
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('');
  const [quant, setQuant] = useState('');
  const [addTag, setAddTag] = useState('');
  const [pulling, setPulling] = useState<Record<string, PullingState>>(() => loadPullingState());
  const [resetCounter, setResetCounter] = useState(0);

  // Heuristic name derivation for tags not in the curated catalog
  const deriveModelName = (tag: string): string => {
    // Expected formats like: "llama3:8b-instruct-q4_0" or "mistral:7b-instruct" or "codellama:7b"
    if (!tag) return tag;
    const [rawFamily, rest] = tag.split(':');
    const familyMap: Record<string, string> = {
      llama3: 'Llama 3',
      llama: 'Llama',
      mistral: 'Mistral',
      codellama: 'Code Llama',
      qwen: 'Qwen',
      gemma: 'Gemma',
    };
    const family = familyMap[rawFamily?.toLowerCase?.()] || (rawFamily ? rawFamily.charAt(0).toUpperCase() + rawFamily.slice(1) : '');
    if (!rest) return family || tag;
    const parts = rest.split(/[-_]/g).filter(Boolean);
    const prettyParts = parts.map(p => {
      const up = p.toUpperCase();
      // keep quant strings uppercased
      if (/^q\d_\d$/.test(p)) return up;
      if (/^q\d$/.test(p)) return up;
      if (/^fp\d{2}$/.test(p)) return up;
      // 7b -> 7B
      if (/^\d+b$/i.test(p)) return p.toUpperCase();
      // instruct/coder/chat -> Capitalize
      return p.charAt(0).toUpperCase() + p.slice(1);
    });
    const name = [family, ...prettyParts].join(' ').trim();
    return name || tag;
  };

  // Minimal curated catalog for MVP; in future, fetch from backend/catalog service
  const catalog: CatalogItem[] = useMemo(() => [
    { name: 'Llama 3 8B Instruct', tag: 'llama3:8b-instruct-q4_0', size: 1_900_000_000, family: 'llama', quant: 'q4_0', notes: 'Good general chat' },
    { name: 'Code Llama 7B', tag: 'codellama:7b-instruct-q4_0', size: 1_800_000_000, family: 'codellama', quant: 'q4_0', notes: 'Coding tasks' },
    { name: 'Mistral 7B Instruct', tag: 'mistral:7b-instruct-q5_1', size: 1_700_000_000, family: 'mistral', quant: 'q5_1', notes: 'Compact and fast' },
  ], []);

  // Derived discover list with basic search/filter
  const discoverFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter(item => {
      const matchesText = !q || item.name.toLowerCase().includes(q) || item.tag.toLowerCase().includes(q);
      const matchesFamily = !family || item.family === family;
      const matchesQuant = !quant || item.quant === quant;
      return matchesText && matchesFamily && matchesQuant;
    });
  }, [catalog, query, family, quant]);

  // Connection and installed models
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const v = await ollamaService.getVersion();
        if (!mounted) return;
        setConnected(true);
        setVersion(v);
      } catch {
        if (!mounted) return;
        setConnected(false);
      }
      try {
        const models = await ollamaService.listModels();
        if (!mounted) return;
        setInstalled(Array.isArray(models) ? models : []);
        
        // Clean up stale downloads: if a model is installed, remove it from pulling state
        // If a model was being pulled but isn't installed, mark it with an error
        setPulling(prev => {
          const updated = { ...prev };
          let changed = false;
          
          Object.keys(updated).forEach(tag => {
            if (models.includes(tag)) {
              // Model was completed while we were away
              delete updated[tag];
              changed = true;
            } else if (!updated[tag].error) {
              // Model was being pulled but has no controller (stale from page reload)
              // Mark it as interrupted so user can retry
              updated[tag] = {
                ...updated[tag],
                error: 'Download interrupted. Click retry to resume.',
              };
              changed = true;
            }
          });
          
          return changed ? updated : prev;
        });
      } catch (e) {
        // keep installed empty when disconnected
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Persist default model
  useEffect(() => {
    if (defaultModel) localStorage.setItem('llama-herd-default-ollama-model', defaultModel);
    else localStorage.removeItem('llama-herd-default-ollama-model');
  }, [defaultModel]);

  // Persist pulling state to localStorage whenever it changes
  useEffect(() => {
    savePullingState(pulling);
  }, [pulling]);

  // Clean up pulling state for models that are now installed
  useEffect(() => {
    if (installed.length === 0) return;
    setPulling(prev => {
      const updated = { ...prev };
      let changed = false;
      installed.forEach(tag => {
        if (updated[tag] && !updated[tag].error) {
          delete updated[tag];
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [installed]);

  const startPull = (tag: string, sizeHint?: number) => {
    if (installed.includes(tag)) return; // prevent duplicate pull
    if (!connected) return;
    if (sizeHint && sizeHint > SIZE_CONFIRM_THRESHOLD) {
      const ok = window.confirm(`This model may download ~${(sizeHint / (1024**3)).toFixed(1)} GB. Continue?`);
      if (!ok) return;
    }
    const controller = new AbortController();
    setPulling(prev => ({ ...prev, [tag]: { controller, progress: 0 } }));
    
    // Run the pull operation in the background without blocking the UI
    // Use setTimeout to ensure this runs after the current call stack clears
    setTimeout(() => {
      (async () => {
        try {
          let lastUpdateTime = 0;
          const UPDATE_THROTTLE = 200; // Update UI at most every 200ms
          
          await ollamaService.pullModel(tag, (p) => {
            const now = Date.now();
            // Throttle state updates to avoid overwhelming React
            if (now - lastUpdateTime < UPDATE_THROTTLE && p.completed !== p.total) {
              return;
            }
            lastUpdateTime = now;
            
            setPulling(prev => {
              const total = p.total ?? prev[tag]?.total;
              const completed = p.completed ?? 0;
              const progress = total && total > 0 ? Math.min(100, Math.floor((completed / total) * 100)) : undefined;
              return { ...prev, [tag]: { ...prev[tag], controller, total, progress, error: p.error } };
            });
          }, controller.signal);
          // refresh installed after pull success
          const models = await ollamaService.listModels();
          setInstalled(Array.isArray(models) ? models : []);
          // keep progress visible briefly then clear
          setTimeout(() => {
            setPulling(prev => {
              const { [tag]: _, ...rest } = prev;
              return rest;
            });
          }, 400);
        } catch (e: any) {
          // If aborted, don't surface an error or re-add the entry
          const aborted = e?.name === 'AbortError' || /aborted/i.test(e?.message || '') || controller.signal.aborted;
          if (aborted) {
            // Remove from pulling state when cancelled
            setPulling(prev => {
              const { [tag]: _, ...rest } = prev;
              return rest;
            });
          } else {
            setPulling(prev => ({ ...prev, [tag]: { ...prev[tag], controller, error: e?.message || 'Pull failed' } }));
          }
        }
      })();
    }, 0);
  };

  const cancelPull = (tag: string) => {
    const ctl = pulling[tag]?.controller;
    if (ctl) {
      ctl.abort();
    }
    // Remove from state immediately
    setPulling(prev => {
      const { [tag]: _, ...rest } = prev;
      return rest;
    });
  };

  const removeModel = async (tag: string) => {
    await ollamaService.deleteModel(tag);
  const models = await ollamaService.listModels();
  setInstalled(Array.isArray(models) ? models : []);
    if (defaultModel === tag) setDefaultModel('');
  };

  // UI helpers
  const renderProgress = (tag: string, opts?: { showCancel?: boolean }) => {
    const p = pulling[tag];
    if (!p) return null;
    const aria: any = p.progress !== undefined ? { 'aria-valuenow': p.progress, 'aria-valuemin': 0, 'aria-valuemax': 100 } : {};
    const showCancel = opts?.showCancel ?? true;
    const hasActiveController = !!p.controller;
    
    return (
      <div className="mt-2">
        <div role="progressbar" {...aria} className="w-full h-2 bg-gray-700 rounded-full overflow-hidden" aria-label={`Downloading ${tag}`}>
          <div className="h-2 bg-purple-600 transition-all" style={{ width: `${p.progress ?? 0}%` }} />
        </div>
        <span className="sr-only" aria-live="polite">{p.progress !== undefined ? `${p.progress}%` : 'Downloading'}</span>
        {showCancel && (
          <div className="flex items-center gap-2 mt-2">
            {hasActiveController && <Button variant="secondary" onClick={() => cancelPull(tag)} aria-label={`Cancel ${tag}`}>Cancel</Button>}
            {p.error && <span className="text-red-500 text-sm" role="alert">{p.error} <button className="underline" onClick={() => startPull(tag)}>Retry</button></span>}
          </div>
        )}
      </div>
    );
  };

  const ActiveDownloads = () => {
    const tags = Object.keys(pulling);
    if (tags.length === 0) return null;
    return (
      <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Active downloads</div>
        <div className="space-y-3">
          {tags.map(tag => (
            <div key={tag}>
              <div className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{tag}</div>
              {renderProgress(tag)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const Header = () => (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Models</h2>
        <div className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full ${connected ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`} aria-live="polite">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: connected ? '#22c55e' : '#ef4444' }} />
            Ollama: {connected ? `Connected${version ? ` (${version})` : ''}` : 'Disconnected'}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          value={addTag}
          onChange={(e) => setAddTag(e.target.value)}
          placeholder="Add by tag (e.g., llama3:8b-instruct-q4_0)"
          aria-label="Add model by exact tag"
          className="p-2 rounded-lg border"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
        />
        <Button onClick={() => startPull(addTag)} disabled={!addTag || (installed?.includes(addTag) ?? false) || !connected} title={connected ? ((installed?.includes(addTag) ?? false) ? 'Already installed' : 'Pull model by tag') : 'Ollama is not connected.'} aria-label="Pull by tag">
          Pull
        </Button>
      </div>
    </div>
  );

  const Tabs = () => {
    const keys: TabKey[] = ['installed', 'discover'];
    const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
      const idx = keys.indexOf(active);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActive(keys[(idx + 1) % keys.length]);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActive(keys[(idx - 1 + keys.length) % keys.length]);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActive(keys[0]);
      } else if (e.key === 'End') {
        e.preventDefault();
        setActive(keys[keys.length - 1]);
      }
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
            aria-selected={active === key}
            className={`px-4 py-2 ${active === key ? 'border-b-2 border-purple-600 text-purple-400' : ''}`}
            onClick={() => setActive(key)}
          >
            {key === 'installed' ? 'Installed' : 'Discover'}
          </button>
        ))}
      </div>
    );
  };

  const Installed = () => (
    <div>
      {!installed || installed.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No local models found.</p>
      ) : (
        <div className="space-y-3">
          {installed.map(tag => {
            const label = catalog.find(i => i.tag === tag)?.name || deriveModelName(tag);
            return (
              <div key={tag} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</div>
                    {label !== tag && (
                      <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{tag}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant={defaultModel === tag ? 'primary' : 'secondary'} onClick={() => setDefaultModel(tag)} aria-label={`Set ${tag} as default`}>
                      {defaultModel === tag ? 'Default' : 'Set default'}
                    </Button>
                    <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(tag)} aria-label={`Copy tag ${tag}`} title="Copy tag">
                      <Icon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></Icon>
                    </Button>
                    <Button variant="secondary" onClick={() => removeModel(tag)} aria-label={`Remove ${tag}`}>Remove</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const Discover = () => {
    const searchRef = useRef<HTMLInputElement | null>(null);
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or tag"
            aria-label="Search models"
            className="flex-1 p-2 rounded-lg border"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
          />
        <select value={family} onChange={(e) => setFamily(e.target.value)} aria-label="Filter by family" className="p-2 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>
          <option value="">Family</option>
          <option value="llama">Llama</option>
          <option value="mistral">Mistral</option>
          <option value="codellama">CodeLlama</option>
        </select>
        <select value={quant} onChange={(e) => setQuant(e.target.value)} aria-label="Filter by quantization" className="p-2 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>
          <option value="">Quant</option>
          <option value="q4_0">q4_0</option>
          <option value="q5_1">q5_1</option>
          <option value="fp16">fp16</option>
        </select>
          {(query || family || quant) && (
            <Button variant="secondary" onClick={() => { setQuery(''); setFamily(''); setQuant(''); if (searchRef.current) searchRef.current.value = ''; setResetCounter((v) => v + 1); }} aria-label="Clear filters">Clear</Button>
          )}
        </div>

        <div key={`discover-${resetCounter}`} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {discoverFiltered.map(item => {
          const isInstalled = (installed?.includes(item.tag)) ?? false;
          const isPulling = !!pulling[item.tag];
          return (
            <div key={item.tag} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.name}</div>
                  <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{item.tag} • {item.quant} {(item.size && `• ${(item.size/(1024**3)).toFixed(1)} GB`) || ''}</div>
                  {renderProgress(item.tag, { showCancel: false })}
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <Button
                    onClick={() => startPull(item.tag, item.size)}
                    disabled={isInstalled || isPulling || !connected}
                    title={!connected ? 'Ollama is not connected.' : (isInstalled ? 'Installed' : 'Pull model')}
                    aria-label={isInstalled ? `Installed ${item.tag}` : `Pull ${item.tag}`}
                  >
                    {isInstalled ? 'Installed' : isPulling ? 'Pulling…' : 'Pull'}
                  </Button>
                  {/* Cancel action available in Active downloads; avoid duplicate buttons here */}
                </div>
              </div>
              {pulling[item.tag]?.error && (
                <div className="text-red-500 text-sm mt-2" role="alert">{pulling[item.tag]?.error} <a className="underline" href="#" onClick={(e) => { e.preventDefault(); startPull(item.tag); }}>Retry</a></div>
              )}
            </div>
          );
        })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 animate-fade-in">
      <Header />
      <Tabs />
      <ActiveDownloads />
      <div
        role="tabpanel"
        id="panel-installed"
        aria-labelledby="tab-installed"
        hidden={active !== 'installed'}
      >
        <Installed />
      </div>
      <div
        role="tabpanel"
        id="panel-discover"
        aria-labelledby="tab-discover"
        hidden={active !== 'discover'}
      >
        <Discover />
      </div>
    </div>
  );
};

export default Models;
