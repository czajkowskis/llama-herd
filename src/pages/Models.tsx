import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ollamaService } from '../services/ollamaService';
import { usePullTasks } from '../hooks/usePullTasks';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { ConfirmationPopup } from '../components/ui/ConfirmationPopup';

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
  completed?: number;
  error?: string;
  controller?: AbortController; // Not persisted, recreated on mount
  startTime?: number;
  lastUpdateTime?: number;
  speed?: number; // bytes per second
};

const SIZE_CONFIRM_THRESHOLD = 2 * 1024 * 1024 * 1024; // 2GB
const PULLING_STATE_KEY = 'llama-herd-pulling-models';

// Connection retry configuration
const INITIAL_RETRY_DELAY = 5000; // 5 seconds
const MAX_RETRY_DELAY = 300000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 10;

// Helper to save pulling state to localStorage (without controllers and runtime data)
const savePullingState = (state: Record<string, PullingState>) => {
  const persistable: Record<string, Omit<PullingState, 'controller' | 'startTime' | 'lastUpdateTime' | 'speed'>> = {};
  Object.entries(state).forEach(([tag, data]) => {
    persistable[tag] = {
      progress: data.progress,
      total: data.total,
      completed: data.completed,
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
        completed: data.completed,
        error: data.error,
      };
    });
    return state;
  } catch (e) {
    console.error('Failed to load pulling state:', e);
    return {};
  }
};

// Custom hook for Ollama connection with retry logic
const useOllamaConnection = () => {
  const [connected, setConnected] = useState<boolean>(false);
  const [version, setVersion] = useState<string>('');
  const [connectionError, setConnectionError] = useState<string>('');
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);

  const checkConnection = async () => {
    try {
      const v = await ollamaService.getVersion();
      setConnected(true);
      setVersion(v);
      setConnectionError('');
      retryCountRef.current = 0; // Reset retry count on success
      setIsRetrying(false);
    } catch (error: any) {
      setConnected(false);
      setVersion('');
      setConnectionError(error.message || 'Connection failed');
      scheduleRetry();
    }
  };

  const scheduleRetry = () => {
    if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
      setConnectionError('Maximum retry attempts reached. Please check Ollama installation.');
      setIsRetrying(false);
      return;
    }

    setIsRetrying(true);
    const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, retryCountRef.current), MAX_RETRY_DELAY);
    retryCountRef.current += 1;

    retryTimeoutRef.current = setTimeout(() => {
      checkConnection();
    }, delay);
  };

  const manualRetry = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    retryCountRef.current = 0;
    checkConnection();
  };

  useEffect(() => {
    checkConnection();
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    connected,
    version,
    connectionError,
    isRetrying,
    manualRetry,
  };
};

export const Models: React.FC = () => {
  const [active, setActive] = useState<TabKey>('installed');
  const [installed, setInstalled] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState<string>(() => localStorage.getItem('llama-herd-default-ollama-model') || '');
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('');
  const [quant, setQuant] = useState('');
  const [addTag, setAddTag] = useState('');
  const [pulling, setPulling] = useState<Record<string, PullingState>>(() => loadPullingState());
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
        const res = await fetch('/api/models/catalog');
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

    if (!tryLoadCached()) {
      loadRemote();
    }

    return () => { mounted = false; };
  }, []);

  // Initialize expanded groups when catalog changes
  useEffect(() => {
    const groups = groupModelsByBaseName(catalog);
    setExpandedGroups(new Set());
  }, [catalog]);

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
  }, [connected]);

  // Persist default model
  useEffect(() => {
    if (defaultModel) localStorage.setItem('llama-herd-default-ollama-model', defaultModel);
    else localStorage.removeItem('llama-herd-default-ollama-model');
  }, [defaultModel]);

  // Persist pulling state to localStorage whenever it changes
  useEffect(() => {
    savePullingState(pulling);
  }, [pulling]);

  // Merge PullTasksContext (server-backed + websocket-updated) into the local pulling state
  const { pullTasks, dismissByModelName, dismissAllErrors, dismissTask } = usePullTasks();

  useEffect(() => {
    // pullTasks is a map of task_id -> task data
    setPulling(prev => {
      const updated = { ...prev };
      Object.values(pullTasks).forEach((t: any) => {
        const tag = t.model_name;
        if (!tag) return;

        if (t.status === 'running' || t.status === 'pending') {
          const total = t.progress?.total ?? undefined;
          const completed = t.progress?.completed ?? undefined;
          const progressPercent = (typeof total === 'number' && typeof completed === 'number' && total > 0)
            ? Math.min(100, Math.floor((completed / total) * 100))
            : undefined;

          // Derive speed and ETA from server timestamps when possible
          let speed: number | undefined = undefined;
          let lastUpdateTime: number | undefined = undefined;
          // Use started_at from server if available to estimate average speed
          if (t.started_at && typeof completed === 'number') {
            try {
              const started = new Date(t.started_at).getTime();
              const now = Date.now();
              const elapsedSec = Math.max(1, (now - started) / 1000);
              speed = completed / elapsedSec; // bytes per second (average)
              lastUpdateTime = now;
            } catch (e) {
              // ignore parse errors
            }
          }

          updated[tag] = {
            ...updated[tag],
            // keep any existing controller if present (local active pulls)
            controller: updated[tag]?.controller,
            total,
            completed,
            progress: progressPercent,
            error: t.error ?? undefined,
            lastUpdateTime: lastUpdateTime ?? updated[tag]?.lastUpdateTime,
            speed: speed ?? updated[tag]?.speed,
            startTime: t.started_at ? new Date(t.started_at).getTime() : updated[tag]?.startTime,
          } as PullingState;
        } else if (t.status === 'error') {
          updated[tag] = {
            ...updated[tag],
            controller: updated[tag]?.controller,
            error: t.error || 'Download interrupted. Click retry to resume.'
          } as PullingState;
        }
      });
      return updated;
    });
  }, [pullTasks]);

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
    
    const controller = new AbortController();
    const startTime = Date.now();
    setPulling(prev => ({ ...prev, [tag]: { controller, progress: 0, startTime } }));
    
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
              
              // Calculate speed and ETA
              const currentTime = Date.now();
              const startTime = prev[tag]?.startTime || currentTime;
              const elapsed = (currentTime - startTime) / 1000; // seconds
              const speed = elapsed > 0 ? completed / elapsed : 0; // bytes per second
              const remaining = total && total > completed ? (total - completed) / speed : 0;
              
              return { 
                ...prev, 
                [tag]: { 
                  ...prev[tag], 
                  controller, 
                  total, 
                  completed,
                  progress, 
                  error: p.error,
                  lastUpdateTime: currentTime,
                  speed: speed > 0 ? speed : prev[tag]?.speed
                } 
              };
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
            // Check if it was a network error that might be recoverable
            const networkError = /network|timeout|connection|fetch/i.test(e?.message || '');
            const errorMessage = networkError 
              ? 'Download interrupted due to network issues. You can retry to continue downloading.'
              : e?.message || 'Pull failed';
            
            setPulling(prev => ({ 
              ...prev, 
              [tag]: { 
                ...prev[tag], 
                controller: undefined, // Clear controller so it's not considered active
                error: errorMessage,
                completed: prev[tag]?.completed || 0 // Preserve progress
              } 
            }));
          }
        }
      })();
    }, 0);
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

  const cancelPull = (tag: string) => {
    (async () => {
      const ctl = pulling[tag]?.controller;
      // Abort local controller if present
      try {
        if (ctl) ctl.abort();
      } catch (e) {
        console.warn('Failed to abort local controller', e);
      }

      // Also attempt to cancel server-side pull if one exists for this model
      try {
        const serverTask = Object.values(pullTasks).find((t: any) => t.model_name === tag && (t.status === 'running' || t.status === 'pending')) as any | undefined;
        if (serverTask && serverTask.task_id) {
          await ollamaService.cancelModelPull(serverTask.task_id);
        }
      } catch (e) {
        console.warn('Failed to cancel server-side pull task', e);
      }

      // Remove from state immediately
      setPulling(prev => {
        const { [tag]: _, ...rest } = prev;
        return rest;
      });
    })();
  };

  const dismissNotification = (tag: string) => {
    // Dismiss server-persisted tasks for this model (so they don't reappear)
    try {
      dismissByModelName(tag);
    } catch (e) {
      // ignore
    }

    // Remove local-only pulling entry
    setPulling(prev => {
      const { [tag]: _, ...rest } = prev;
      return rest;
    });
  };

  const dismissAllNotifications = () => {
    // Dismiss server-side error tasks so they don't reappear
    try {
      dismissAllErrors();
    } catch (e) {
      // ignore
    }

    // Remove local-only error entries as well
    setPulling(prev => {
      const next: Record<string, PullingState> = { ...prev };
      Object.keys(prev).forEach(tag => {
        if (prev[tag]?.error) {
          delete next[tag];
        }
      });
      return next;
    });
  };

  const removeModel = (tag: string) => {
    setPendingRemoval(tag);
    setShowConfirmPopup(true);
  };

  // function to pull all models in a family
  const pullAllInFamily = (familyName: string) => {
    // Skip models already installed according to live state or annotated in the catalog
    const familyModels = catalog.filter(item => item.family === familyName && !(installed.includes(item.tag) || ((item as any).installed ?? false)));
    if (familyModels.length === 0) return;
    
    const totalSize = familyModels.reduce((sum, item) => sum + (item.size || 0), 0);
    const confirmMessage = `Pull all ${familyModels.length} ${familyName} models? Total size: ~${(totalSize / (1024**3)).toFixed(1)} GB`;
    
    if (window.confirm(confirmMessage)) {
      familyModels.forEach(item => {
        setTimeout(() => startPull(item.tag, item.size), Math.random() * 1000); // Stagger starts
      });
    }
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
          <div className="flex gap-2">
            {speed && <span>{speed}</span>}
            {eta && <span>ETA: {eta}</span>}
          </div>
        </div>
        <span className="sr-only" aria-live="polite">{p.progress !== undefined ? `${p.progress}% complete${speed ? ` at ${speed}` : ''}${eta ? `, ${eta} remaining` : ''}` : 'Downloading'}</span>
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
                        setPulling(prev => {
                          const { [tag]: _, ...rest } = prev;
                          return rest;
                        });
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
      <div className="flex gap-2">
        <input
          value={addTag}
          onChange={(e) => setAddTag(e.target.value)}
          placeholder="Add by tag (e.g., llama3:8b-instruct-q4_0)"
          aria-label="Add model by exact tag"
          className="p-2 rounded-lg border"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
        />
        <Button
          onClick={() => startPull(addTag)}
          disabled={
            !addTag ||
            (installed?.includes(addTag) ?? false) ||
            (catalog.some(c => c.tag === addTag && (c as any).installed)) ||
            !connected
          }
          title={
            !connected
              ? 'Ollama is not connected.'
              : ((installed?.includes(addTag) ?? false) || catalog.some(c => c.tag === addTag && (c as any).installed))
                ? 'Already installed'
                : 'Pull model by tag'
          }
          aria-label="Pull by tag"
        >
          Pull
        </Button>
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

  const Installed = () => {
    const [copiedTag, setCopiedTag] = React.useState<string | null>(null);

    return (
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
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          try {
                            await navigator.clipboard?.writeText(tag);
                            setCopiedTag(tag);
                            window.setTimeout(() => setCopiedTag((cur) => (cur === tag ? null : cur)), 2000);
                          } catch (err) {
                            console.error('Failed to copy tag', err);
                          }
                        }}
                        aria-label={`Copy tag ${tag}`}
                        title={copiedTag === tag ? 'Copied!' : 'Copy tag'}
                      >
                        <Icon>
                          {copiedTag === tag ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><polyline points="20 6 9 17 4 12" /></svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          )}
                        </Icon>
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
  };

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
          <option value="">All Families</option>
          <option value="llama">Llama</option>
          <option value="codellama">Code Llama</option>
          <option value="mistral">Mistral</option>
          <option value="phi">Phi</option>
          <option value="gemma">Gemma</option>
          <option value="qwen">Qwen</option>
          <option value="vicuna">Vicuna</option>
          <option value="orca">Orca</option>
        </select>
        <select value={quant} onChange={(e) => setQuant(e.target.value)} aria-label="Filter by quantization" className="p-2 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>
          <option value="">All Quants</option>
          <option value="q3_K_M">q3_K_M</option>
          <option value="q4_0">q4_0</option>
          <option value="q5_0">q5_0</option>
          <option value="q5_1">q5_1</option>
          <option value="fp16">fp16</option>
        </select>
          {(query || family || quant) && (
            <Button variant="secondary" onClick={() => { setQuery(''); setFamily(''); setQuant(''); if (searchRef.current) searchRef.current.value = ''; setResetCounter((v) => v + 1); }} aria-label="Clear filters">Clear</Button>
          )}
        </div>

        <div key={`discover-${resetCounter}`} className="space-y-4">
          {Object.entries(groupModelsByBaseName(discoverFiltered)).map(([baseName, variants]) => {
            // Consider an item installed if either the live installed list reports it
            // or the backend-catalog annotated it as installed.
            const allInstalled = variants.every(item => ((installed?.includes(item.tag) ?? false) || ((item as any).installed ?? false)));
            const somePulling = variants.some(item => !!pulling[item.tag]);
            const familyName = variants[0].family;
            const isExpanded = expandedGroups.has(baseName);
            
            return (
              <div key={baseName} className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div 
                      className="flex items-center gap-2 cursor-pointer mb-2" 
                      onClick={() => toggleGroupExpanded(baseName)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleGroupExpanded(baseName);
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
                    </div>
                    
                    {isExpanded && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {variants.map(item => {
                          const isInstalled = (installed?.includes(item.tag) ?? false) || ((item as any).installed ?? false);
                          const isPulling = !!pulling[item.tag];
                          
                          return (
                            <div key={item.tag} className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                  {item.name}
                                </div>
                                <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                                  {item.size && `${(item.size/(1024**3)).toFixed(1)} GB`}
                                </div>
                              </div>
                              
                              <div className="text-xs mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                                {item.tag}
                              </div>
                              
                              {renderProgress(item.tag, { showCancel: false })}
                              
                              <div className="flex justify-end mt-2">
                                <Button
                                  className="px-3 py-1 text-sm"
                                  onClick={() => startPull(item.tag, item.size)}
                                  disabled={isInstalled || isPulling || !connected}
                                  title={!connected ? 'Ollama is not connected.' : (isInstalled ? 'Installed' : 'Pull model')}
                                  aria-label={isInstalled ? `Installed ${item.tag}` : `Pull ${item.tag}`}
                                >
                                  {isInstalled ? '✓' : isPulling ? 'Pulling…' : 'Pull'}
                                </Button>
                              </div>
                              
                              {pulling[item.tag]?.error && (
                                <div className="text-red-500 text-xs mt-2" role="alert">
                                  {pulling[item.tag]?.error} <a className="underline" href="#" onClick={(e) => { e.preventDefault(); startPull(item.tag); }}>Retry</a>
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
