import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ollamaService } from '../../../services/ollamaService';
import { usePullTasks } from '../../../hooks/usePullTasks';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { ConfirmationPopup } from '../../../components/ui/ConfirmationPopup';
import { useOllamaConnection } from '../hooks/useOllamaConnection';
import { useModelPulling } from '../hooks/useModelPulling';
import { InstalledModels } from './InstalledModels';
import { DiscoverModels } from './DiscoverModels';
import { API_BASE_URL } from '../../../config';

type TabKey = 'installed' | 'discover';

type CatalogItem = {
  name: string;
  tag: string; // e.g., "llama3:8b-instruct-q4_0"
  size?: number; // bytes
  family?: string; // llama|mistral|codellama
  quant?: string; // q4_0|q5_1|fp16
  notes?: string;
};

const SIZE_CONFIRM_THRESHOLD = 2 * 1024 * 1024 * 1024; // 2GB


export const Models: React.FC = () => {
  const [active, setActive] = useState<TabKey>('installed');
  const [installed, setInstalled] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState<string>(() => localStorage.getItem('llama-herd-default-ollama-model') || '');
  const { pulling, startPull, cancelPull, dismissNotification, dismissAllNotifications } = useModelPulling();
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('');
  const [quant, setQuant] = useState('');
  const [resetCounter, setResetCounter] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [pendingPull, setPendingPull] = useState<{ tag: string; sizeHint?: number } | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);

  // Use the connection hook
  const { connected, version, connectionError, isRetrying, manualRetry } = useOllamaConnection();

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

  // Default in-memory catalog used as fallback if backend catalog is unavailable
  const defaultCatalog: CatalogItem[] = [
    // Llama family
    { name: 'Llama 3 8B Instruct', tag: 'llama3:8b-instruct-q4_0', size: 1_900_000_000, family: 'llama', quant: 'q4_0', notes: 'Latest Llama 3 model, great for general chat' },
    { name: 'Llama 3 8B Instruct Q5', tag: 'llama3:8b-instruct-q5_0', size: 2_400_000_000, family: 'llama', quant: 'q5_0', notes: 'Higher quality quantization for better responses' },
    { name: 'Llama 3 8B Instruct FP16', tag: 'llama3:8b-instruct-fp16', size: 6_000_000_000, family: 'llama', quant: 'fp16', notes: 'Full precision for maximum quality' },
    { name: 'Llama 3 70B Instruct', tag: 'llama3:70b-instruct-q4_0', size: 15_000_000_000, family: 'llama', quant: 'q4_0', notes: 'Large 70B model for complex tasks' },

    // Code Llama family
    { name: 'Code Llama 7B', tag: 'codellama:7b-instruct-q4_0', size: 1_800_000_000, family: 'codellama', quant: 'q4_0', notes: 'Specialized for coding tasks' },
    { name: 'Code Llama 13B', tag: 'codellama:13b-instruct-q4_0', size: 3_500_000_000, family: 'codellama', quant: 'q4_0', notes: 'Larger Code Llama for complex coding' },
    { name: 'Code Llama 34B', tag: 'codellama:34b-instruct-q4_0', size: 8_000_000_000, family: 'codellama', quant: 'q4_0', notes: 'Very large Code Llama model' },

    // Mistral family
    { name: 'Mistral 7B Instruct', tag: 'mistral:7b-instruct-q5_1', size: 1_700_000_000, family: 'mistral', quant: 'q5_1', notes: 'Fast and efficient 7B model' },
    { name: 'Mistral 7B Instruct v0.2', tag: 'mistral:7b-instruct-v0.2-q5_1', size: 1_700_000_000, family: 'mistral', quant: 'q5_1', notes: 'Updated Mistral v0.2' },
    { name: 'Mixtral 8x7B Instruct', tag: 'mixtral:8x7b-instruct-v0.1-q3_K_M', size: 7_500_000_000, family: 'mistral', quant: 'q3_K_M', notes: 'Mixture of experts model' },

    // Other popular models
    { name: 'Phi-3 Mini 3.8B', tag: 'phi3:3.8b-mini-instruct-4k-q4_0', size: 900_000_000, family: 'phi', quant: 'q4_0', notes: 'Microsoft Phi-3, efficient and capable' },
    { name: 'Gemma 7B', tag: 'gemma:7b-instruct-q4_0', size: 1_800_000_000, family: 'gemma', quant: 'q4_0', notes: 'Google Gemma model' },
    { name: 'Qwen 7B Chat', tag: 'qwen:7b-chat-q4_0', size: 1_900_000_000, family: 'qwen', quant: 'q4_0', notes: 'Alibaba Qwen model' },
    { name: 'Vicuna 13B', tag: 'vicuna:13b-q4_0', size: 3_000_000_000, family: 'vicuna', quant: 'q4_0', notes: 'Fine-tuned Llama-based model' },
    { name: 'Orca Mini 7B', tag: 'orca-mini:7b-q4_0', size: 1_800_000_000, family: 'orca', quant: 'q4_0', notes: 'Microsoft Orca model' },
    
    {
        "name": "GPT-OSS 20B",
        "tag": "gpt-oss:20b",
        "size": 14000000000,
        "family": "gpt-oss",
        "quant": "q4_0",
        "notes": "OpenAI’s open-weight model for powerful reasoning and agentic tasks, designed for lower latency and local use"
    },
    {
        "name": "GPT-OSS 120B",
        "tag": "gpt-oss:120b",
        "size": 65000000000,
        "family": "gpt-oss",
        "quant": "q4_0",
        "notes": "OpenAI’s open-weight model for powerful reasoning and agentic tasks, high-end capabilities"
    },
    {
        "name": "Qwen3-VL 235B",
        "tag": "qwen3-vl:235b-cloud",
        "size": 125000000000,
        "family": "qwen",
        "quant": "cloud",
        "notes": "The most powerful vision-language model in the Qwen family, supports text and image input"
    },
    {
        "name": "DeepSeek-R1 1.5B",
        "tag": "deepseek-r1:1.5b",
        "size": 1500000000,
        "family": "deepseek",
        "quant": "q4_0",
        "notes": "Open reasoning model, lightweight and efficient"
    },
    {
        "name": "DeepSeek-R1 7B",
        "tag": "deepseek-r1:7b",
        "size": 4700000000,
        "family": "deepseek",
        "quant": "q4_0",
        "notes": "Open reasoning model, balanced performance and size"
    },
    {
        "name": "DeepSeek-R1 8B",
        "tag": "deepseek-r1:8b",
        "size": 5200000000,
        "family": "deepseek",
        "quant": "q4_0",
        "notes": "Open reasoning model, optimized for reasoning and coding"
    },
    {
        "name": "DeepSeek-R1 14B",
        "tag": "deepseek-r1:14b",
        "size": 9000000000,
        "family": "deepseek",
        "quant": "q4_0",
        "notes": "Open reasoning model, high reasoning capabilities"
    },
    {
        "name": "DeepSeek-R1 32B",
        "tag": "deepseek-r1:32b",
        "size": 18000000000,
        "family": "deepseek",
        "quant": "q4_0",
        "notes": "Open reasoning model, advanced reasoning and agentic tasks"
    },
    {
        "name": "DeepSeek-R1 70B",
        "tag": "deepseek-r1:70b",
        "size": 40000000000,
        "family": "deepseek",
        "quant": "q4_0",
        "notes": "Open reasoning model, top-tier reasoning and coding"
    },
    {
        "name": "DeepSeek-R1 671B",
        "tag": "deepseek-r1:671b",
        "size": 404000000000,
        "family": "deepseek",
        "quant": "q2_0",
        "notes": "Open reasoning model, flagship model for cloud or high-end hardware"
    },
    {
        "name": "Qwen3-Coder 30B",
        "tag": "qwen3-coder:30b",
        "size": 19000000000,
        "family": "qwen",
        "quant": "q4_0",
        "notes": "Alibaba's performant long context model for agentic and coding tasks"
    },
    {
        "name": "Qwen3-Coder 480B",
        "tag": "qwen3-coder:480b-cloud",
        "size": 240000000000,
        "family": "qwen",
        "quant": "q2_0",
        "notes": "Alibaba's performant long context model for agentic and coding tasks, cloud-only"
    },
    {
        "name": "Gemma3 270M",
        "tag": "gemma3:270m",
        "size": 300000000,
        "family": "gemma",
        "quant": "q4_0",
        "notes": "Google’s most capable model that runs on a single GPU, ultra-lightweight, multimodal"
    },
    {
        "name": "Gemma3 1B",
        "tag": "gemma3:1b",
        "size": 800000000,
        "family": "gemma",
        "quant": "q4_0",
        "notes": "Google’s most capable model that runs on a single GPU, compact, multimodal"
    },
    {
        "name": "Gemma3 4B",
        "tag": "gemma3:4b",
        "size": 3300000000,
        "family": "gemma",
        "quant": "q4_0",
        "notes": "Google’s most capable model that runs on a single GPU, balanced performance, multimodal"
    },
    {
        "name": "Gemma3 12B",
        "tag": "gemma3:12b",
        "size": 9000000000,
        "family": "gemma",
        "quant": "q4_0",
        "notes": "Google’s most capable model that runs on a single GPU, high performance, multimodal"
    },
    {
        "name": "Gemma3 27B",
        "tag": "gemma3:27b",
        "size": 17000000000,
        "family": "gemma",
        "quant": "q4_0",
        "notes": "Google’s most capable model that runs on a single GPU, top-tier multimodal model"
    },
    {
        "name": "GLM-4.6",
        "tag": "glm-4.6:cloud",
        "size": 216000000000,
        "family": "glm",
        "quant": "cloud",
        "notes": "Advanced agentic, reasoning, and coding capabilities, cloud-only, 198K context"
    },
    {
        "name": "EmbeddingGemma 300M",
        "tag": "embeddinggemma:latest",
        "size": 600000000,
        "family": "gemma",
        "quant": "bf16",
        "notes": "Google’s 300M parameter embedding model, state-of-the-art for its size"
    },
    {
        "name": "Qwen3 0.6B",
        "tag": "qwen3:0.6b",
        "size": 400000000,
        "family": "qwen",
        "quant": "q4_0",
        "notes": "Latest generation of Qwen models, ultra-lightweight"
    },
    {
        "name": "Qwen3 1.7B",
        "tag": "qwen3:1.7b",
        "size": 1100000000,
        "family": "qwen",
        "quant": "q4_0",
        "notes": "Latest generation of Qwen models, lightweight and fast"
    },
    {
        "name": "Qwen3 4B",
        "tag": "qwen3:4b",
        "size": 2500000000,
        "family": "qwen",
        "quant": "q4_0",
        "notes": "Latest generation of Qwen models, balanced performance"
    },
    {
        "name": "Qwen3 8B",
        "tag": "qwen3:8b",
        "size": 5200000000,
        "family": "qwen",
        "quant": "q4_0",
        "notes": "Latest generation of Qwen models, high performance"
    },
    {
        "name": "Qwen3 14B",
        "tag": "qwen3:14b",
        "size": 8000000000,
        "family": "qwen",
        "quant": "q4_0",
        "notes": "Latest generation of Qwen models, advanced reasoning"
    },
    {
        "name": "Qwen3 30B",
        "tag": "qwen3:30b",
        "size": 16000000000,
        "family": "qwen",
        "quant": "q4_0",
        "notes": "Latest generation of Qwen models, MoE, high reasoning"
    },
    {
        "name": "Qwen3 32B",
        "tag": "qwen3:32b",
        "size": 18000000000,
        "family": "qwen",
        "quant": "q4_0",
        "notes": "Latest generation of Qwen models, dense, top-tier"
    },
    {
        "name": "Qwen3 235B",
        "tag": "qwen3:235b",
        "size": 125000000000,
        "family": "qwen",
        "quant": "q2_0",
        "notes": "Latest generation of Qwen models, flagship MoE model"
    },
    {
        "name": "DeepSeek-V3.1 671B",
        "tag": "deepseek-v3.1:latest",
        "size": 404000000000,
        "family": "deepseek",
        "quant": "q4_0",
        "notes": "Hybrid model supporting both thinking and non-thinking modes, cloud or high-end hardware"
    }
  ];

  // Catalog cache (24 hours TTL)
  const CATALOG_CACHE_KEY = 'llama-herd-catalog-v1';
  const CATALOG_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  const [catalog, setCatalog] = useState<CatalogItem[]>(defaultCatalog);
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const tryLoadCached = () => {
      try {
        const raw = localStorage.getItem(CATALOG_CACHE_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        if (Date.now() - (parsed._ts || 0) > CATALOG_CACHE_TTL) return false;
        if (mounted) setCatalog(parsed.models || defaultCatalog);
        return true;
      } catch (e) {
        return false;
      }
    };

    const loadRemote = async () => {
      setCatalogLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/models/catalog`);
        if (!res.ok) throw new Error('catalog fetch failed');
        const data = await res.json();
        const models = data.models || defaultCatalog;
        if (mounted) setCatalog(models);
        try {
          localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({ _ts: Date.now(), models }));
        } catch (e) {
          // ignore storage errors
        }
      } catch (e) {
        // fallback to cached or default
        tryLoadCached();
      } finally {
        if (mounted) setCatalogLoading(false);
      }
    };

    // In production, always fetch fresh data from API
    if (process.env.NODE_ENV === 'production') {
      loadRemote();
    } else if (!tryLoadCached()) {
      loadRemote();
    }

    return () => { mounted = false; };
  }, []);



  // Installed models
  useEffect(() => {
    if (!connected) {
      setInstalled([]);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const models = await ollamaService.listModels();
        if (!mounted) return;
        setInstalled(Array.isArray(models) ? models : []);
        
      } catch (e) {
        // keep installed empty when disconnected
      }
    })();
    return () => { mounted = false; };
  }, [connected]);

  // Persist default model
  useEffect(() => {
    if (defaultModel) localStorage.setItem('llama-herd-default-ollama-model', defaultModel);
    else localStorage.removeItem('llama-herd-default-ollama-model');
  }, [defaultModel]);


  // Merge PullTasksContext (server-backed + websocket-updated) into the local pulling state
  const { pullTasks, dismissByModelName, dismissAllErrors, dismissTask } = usePullTasks();

  // On mount (and when connection is available), fetch server-side persisted pull tasks
  // and merge them into the local `pulling` state so persisted tasks are visible in the UI.
  useEffect(() => {
    let mounted = true;
    if (!connected) return;

    (async () => {
      try {
        // We now consume server-side persisted tasks via the PullTasksContext so
        // that websocket progress updates are handled centrally. If that context
        // is available we will merge its tasks into the local pulling state below.
        // Keep this block empty to avoid duplicate fetches here.
        if (!mounted) return;
      } catch (e) {
        // ignore - we still rely on local cache
      }
    })();

    return () => { mounted = false; };
  }, [connected]);


  const handleStartPull = (tag: string, sizeHint?: number) => {
    // Prevent duplicate pull if the model is already installed according to
    // the live-installed list or annotated in the backend catalog.
    if (installed.includes(tag) || (catalog.find(c => c.tag === tag) as any)?.installed) return; // prevent duplicate pull
    if (!connected) return;
    
    // Show confirmation popup with storage requirements
    setPendingPull({ tag, sizeHint });
    setShowConfirmPopup(true);
  };

  const confirmPull = () => {
    if (!pendingPull) return;
    
    const { tag, sizeHint } = pendingPull;
    setShowConfirmPopup(false);
    setPendingPull(null);
    
    // Use the hook's startPull function
    startPull(tag, sizeHint);
  };

  const cancelConfirmPull = () => {
    setShowConfirmPopup(false);
    setPendingPull(null);
  };

  const confirmRemoval = async () => {
    if (!pendingRemoval) return;

    const tag = pendingRemoval;
    setShowConfirmPopup(false);
    setPendingRemoval(null);

    try {
      await ollamaService.deleteModel(tag);
      const models = await ollamaService.listModels();
      setInstalled(Array.isArray(models) ? models : []);
      if (defaultModel === tag) setDefaultModel('');
    } catch (error) {
      console.error('Failed to remove model:', error);
      // Could add error handling UI here if needed
    }
  };

  const cancelRemoval = () => {
    setShowConfirmPopup(false);
    setPendingRemoval(null);
  };


  const removeModel = (tag: string) => {
    setPendingRemoval(tag);
    setShowConfirmPopup(true);
  };

  // Group models by base name (excluding size and quantization)
  const groupModelsByBaseName = (models: CatalogItem[]) => {
    const groups: Record<string, CatalogItem[]> = {};
    
    models.forEach(item => {
      // Create base name by removing size and quantization info
      const baseName = item.name
        .replace(/\s+\d+B?\s*/i, ' ')  // Remove size patterns like "8B", "70B", "7B", etc.
        .replace(/\s+(q\d+_\d+|q\d+|fp\d+|f\d+)$/i, '')  // Remove quantization
        .replace(/\s+$/, '')  // Trim trailing spaces
        .trim();
      if (!groups[baseName]) {
        groups[baseName] = [];
      }
      groups[baseName].push(item);
    });
    
    return groups;
  };

  // Toggle expanded state of a group
  const toggleGroupExpanded = (baseName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(baseName)) {
        newSet.delete(baseName);
      } else {
        newSet.add(baseName);
      }
      return newSet;
    });
  };


  // UI helpers
  const renderProgress = (tag: string, opts?: { showCancel?: boolean }) => {
    const p = pulling[tag];
    if (!p) return null;
    const aria: any = p.progress !== undefined ? { 'aria-valuenow': p.progress, 'aria-valuemin': 0, 'aria-valuemax': 100 } : {};
    const showCancel = opts?.showCancel ?? true;
    const hasActiveController = !!p.controller;
  const hasServerTask = Object.values(pullTasks).some((t: any) => t.model_name === tag && (t.status === 'running' || t.status === 'pending'));
    
    // Format speed and ETA
    const formatSpeed = (speed?: number) => {
      if (!speed || speed === 0) return '';
      if (speed >= 1024 * 1024) return `${(speed / (1024 * 1024)).toFixed(1)} MB/s`;
      if (speed >= 1024) return `${(speed / 1024).toFixed(1)} KB/s`;
      return `${speed.toFixed(0)} B/s`;
    };
    
    const formatETA = (remaining?: number) => {
      if (!remaining || remaining === 0 || !isFinite(remaining)) return '';
      if (remaining < 60) return `${Math.ceil(remaining)}s`;
      if (remaining < 3600) return `${Math.ceil(remaining / 60)}m`;
      return `${Math.ceil(remaining / 3600)}h`;
    };
    
    const speed = p.speed ? formatSpeed(p.speed) : '';
    const eta = p.total && p.completed && p.speed ? formatETA((p.total - p.completed) / p.speed) : '';
    
    return (
      <div className="mt-2">
        <div role="progressbar" {...aria} className="w-full h-2 bg-gray-700 rounded-full overflow-hidden" aria-label={`Downloading ${tag}`}>
          <div className="h-2 bg-purple-600 transition-all" style={{ width: `${p.progress ?? 0}%` }} />
        </div>
        <div className="flex justify-between items-center mt-1 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          <span aria-live="polite">{p.progress !== undefined ? `${p.progress}%` : 'Downloading'}</span>
        </div>
        <span className="sr-only" aria-live="polite">{p.progress !== undefined ? `${p.progress}% complete` : 'Downloading'}</span>
        {showCancel && (
          <div className="flex items-center gap-2 mt-2">
            {(hasActiveController || hasServerTask) && <Button variant="secondary" onClick={() => cancelPull(tag)} aria-label={`Cancel ${tag}`}>Cancel</Button>}
            {p.error && (
              <span className="text-red-500 text-sm" role="alert">
                {p.error}{' '}
                <button className="underline" onClick={() => startPull(tag)}>Retry</button>
                {' '}
                {/* Per-task dismiss: prefer server task id when available */}
                <button
                  className="underline ml-2"
                  onClick={async () => {
                    try {
                      // Find a server task id for this model with an error
                      const serverTask = Object.values(pullTasks).find((t: any) => t.model_name === tag && t.error) as any | undefined;
                      if (serverTask && (serverTask.task_id || serverTask.id)) {
                        // Call server to permanently remove the task
                        try {
                          await ollamaService.dismissPullTask(serverTask.task_id || serverTask.id);
                        } catch (e) {
                          console.warn('Server dismiss failed, falling back to local dismiss', e);
                          // fallback to local dismiss so user still clears UI
                          try { dismissTask(serverTask.task_id || serverTask.id); } catch (_) {}
                        }
                      } else {
                        // Fallback: remove local-only entry
                        dismissNotification(tag);
                      }
                    } catch (e) {
                      // ignore errors
                    }
                  }}
                >Dismiss</button>
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const ActiveDownloads = () => {
    const tags = Object.keys(pulling);
    if (tags.length === 0) return null;
    const hasErrors = Object.values(pulling).some(p => !!p.error);
    return (
      <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Active downloads</div>
          {hasErrors && (
            <div>
              <Button variant="secondary" onClick={dismissAllNotifications} className="text-xs">Clear errors</Button>
            </div>
          )}
        </div>
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
          {!connected && (
            <div className="mt-2 text-xs">
              {connectionError && <div className="text-red-400 mb-1">{connectionError}</div>}
              {isRetrying ? (
                <div className="text-yellow-400">Retrying connection...</div>
              ) : (
                <div className="space-y-1">
                  <div>Troubleshooting:</div>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Ensure Ollama is installed and running</li>
                    <li>Check that it's accessible at http://localhost:11434</li>
                    <li>Try restarting Ollama service</li>
                  </ul>
                  <Button variant="secondary" onClick={manualRetry} className="mt-2">
                    Retry Connection
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const Tabs = () => {
    const keys: TabKey[] = ['installed', 'discover'];
    const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
      const idx = keys.indexOf(active);
      // Debug helper to log key navigation
      console.debug('Tabs onKeyDown', e.key, 'activeIndex', idx);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSetActive(keys[(idx + 1) % keys.length]);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSetActive(keys[(idx - 1 + keys.length) % keys.length]);
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleSetActive(keys[0]);
      } else if (e.key === 'End') {
        e.preventDefault();
        handleSetActive(keys[keys.length - 1]);
      }
    };

    const handleSetActive = (key: TabKey) => {
      try {
        console.debug('Tabs handleSetActive', key);
      } catch (e) {
        // ignore
      }
      setActive(key);
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
            onClick={() => handleSetActive(key)}
            onMouseDown={() => handleSetActive(key)}
          >
            {key === 'installed' ? 'Installed' : 'Discover'}
          </button>
        ))}
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
        <InstalledModels
          installed={installed}
          defaultModel={defaultModel}
          onSetDefaultModel={setDefaultModel}
          onRemoveModel={removeModel}
          catalog={catalog}
          deriveModelName={deriveModelName}
        />
      </div>
      <div
        role="tabpanel"
        id="panel-discover"
        aria-labelledby="tab-discover"
        hidden={active !== 'discover'}
      >
        <DiscoverModels
          catalog={catalog}
          installed={installed}
          pulling={pulling}
          connected={connected}
          onStartPull={handleStartPull}
          onRenderProgress={renderProgress}
          groupModelsByBaseName={groupModelsByBaseName}
          expandedGroups={expandedGroups}
          onToggleGroupExpanded={toggleGroupExpanded}
          query={query}
          setQuery={setQuery}
          family={family}
          setFamily={setFamily}
          quant={quant}
          setQuant={setQuant}
          resetCounter={resetCounter}
          setResetCounter={setResetCounter}
        />
      </div>
      
      {/* Confirmation Popup */}
      <ConfirmationPopup
        // Only show the global confirmation popup when there's an active pending action
        isOpen={showConfirmPopup && (pendingPull !== null || pendingRemoval !== null)}
        title={pendingPull ? "Confirm Model Download" : "Confirm Model Removal"}
        message={
          pendingPull 
            ? `This will download the model and use approximately ${(pendingPull.sizeHint ? (pendingPull.sizeHint / (1024**3)).toFixed(1) : 'unknown')} GB of storage. Continue?`
            : pendingRemoval 
              ? `This action will permanently delete the model "${pendingRemoval}" from your system. This cannot be undone. Continue?`
              : ''
        }
        onConfirm={pendingPull ? confirmPull : confirmRemoval}
        onCancel={pendingPull ? cancelConfirmPull : cancelRemoval}
        confirmText={pendingPull ? "Download" : "Remove"}
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
};

export default Models;
