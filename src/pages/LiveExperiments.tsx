import React, { useEffect, useState } from 'react';
import { experimentService } from '../services/experimentService';

interface LiveExperimentSummary {
  experiment_id: string;
  title: string;
  status: string;
  created_at: string;
  agent_count: number;
  message_count: number;
}

interface LiveExperimentsProps {
  onOpenExperiment: (id: string) => void;
}

export const LiveExperiments: React.FC<LiveExperimentsProps> = ({ onOpenExperiment }) => {
  const [experiments, setExperiments] = useState<LiveExperimentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await experimentService.listExperiments();
        if (!mounted) return;
        // Keep only running / live experiments (server may use 'running')
        const live = data.experiments.filter((e: any) => e.status === 'running' || e.status === 'live');
        setExperiments(live as LiveExperimentSummary[]);
      } catch (err: any) {
        console.error('Failed to list experiments:', err);
        if (mounted) setError(err.message || 'Failed to load live experiments');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    // Load once on mount (no periodic polling) — refresh will happen on manual page reload
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="flex items-center justify-center h-32">
            <div className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>Loading live experiments...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="bg-red-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-center h-32">
            <div className="text-lg text-red-100">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-in">
      <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Live Experiments</h1>
        </div>

        {experiments.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>
            <div className="mb-4">No live experiments are running right now.</div>
            <div>
              <button
                onClick={() => { window.location.hash = ''; }}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white"
                title="Create new experiment"
              >
                Create New Experiment
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {experiments.map((exp) => (
              <div key={exp.experiment_id} className="rounded-lg border p-4 hover:shadow-md transition-shadow" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{exp.title || `Experiment ${exp.experiment_id}`}</h3>
                    <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      <span>Agents: {exp.agent_count}</span>
                      <span className="mx-2">•</span>
                      <span>Messages: {exp.message_count}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(exp.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => onOpenExperiment(exp.experiment_id)} className="px-3 py-2 rounded-lg bg-purple-600 text-white">View Live</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveExperiments;
