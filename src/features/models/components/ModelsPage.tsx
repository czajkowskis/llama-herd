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
import { ActiveDownloadsPanel } from '../../../components/models/ActiveDownloadsPanel';
import { ModelTabs } from '../../../components/models/ModelTabs';
import { CatalogItem, defaultCatalog, deriveModelName, groupModelsByBaseName } from '../../../data/modelCatalog';
import { ModelsHeader } from './ModelsHeader';
import { ModelDownloadProgress } from './ModelDownloadProgress';

type TabKey = 'installed' | 'discover';

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
    return (
      <ModelDownloadProgress
        tag={tag}
        pulling={pulling}
        startPull={startPull}
        cancelPull={cancelPull}
        dismissNotification={dismissNotification}
        showCancel={opts?.showCancel}
      />
    );
  };

  return (
    <div className="p-4 animate-fade-in">
      <ModelsHeader
        connected={connected}
        version={version}
        connectionError={connectionError}
        isRetrying={isRetrying}
        manualRetry={manualRetry}
      />
      <ModelTabs
        activeTab={active}
        onTabChange={setActive}
      />
      <ActiveDownloadsPanel
        pulling={pulling}
        onCancelPull={cancelPull}
        onDismissAllNotifications={dismissAllNotifications}
      />
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
