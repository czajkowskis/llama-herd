import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { useNavigationCallbacks, ExperimentView } from '../App';

// Lazy load pages for better performance
const NewExperiment = React.lazy(() => import('../features/experiments/components/NewExperimentPage').then(module => ({ default: module.NewExperiment })));
const LiveExperiments = React.lazy(() => import('../features/experiments/components/LiveExperimentsPage').then(module => ({ default: module.LiveExperiments })));
const History = React.lazy(() => import('../features/history/components/HistoryPage').then(module => ({ default: module.History })));
const Models = React.lazy(() => import('../features/models/components/ModelsPage').then(module => ({ default: module.Models })));
const Settings = React.lazy(() => import('../pages/Settings').then(module => ({ default: module.Settings })));
const About = React.lazy(() => import('../pages/About').then(module => ({ default: module.About })));
const ConversationViewer = React.lazy(() => import('../features/history/components/ConversationViewerPage').then(module => ({ default: module.ConversationViewer })));

// Loading component
const LoadingFallback: React.FC = () => (
  <div className="p-8 animate-fade-in">
    <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="flex items-center justify-center h-32">
        <div className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>Loading...</div>
      </div>
    </div>
  </div>
);


/**
 * Main application routes configuration
 */
export const AppRoutes: React.FC = () => {
  const { handleExperimentStart, handleOpenExperiment } = useNavigationCallbacks();

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Default route - New Experiment */}
          <Route path="/" element={<NewExperiment onExperimentStart={handleExperimentStart} />} />
          
          {/* Live Experiments */}
          <Route 
            path="/live-experiments" 
            element={<LiveExperiments onOpenExperiment={handleOpenExperiment} />} 
          />
          
          {/* Individual Experiment View */}
          <Route 
            path="/experiment/:experimentId" 
            element={<ExperimentView />} 
          />
          
          {/* History */}
          <Route path="/history" element={<History />} />
          
          {/* Models */}
          <Route path="/models" element={<Models />} />
          
          {/* Settings */}
          <Route path="/settings" element={<Settings />} />
          
          {/* About */}
          <Route path="/about" element={<About />} />
          
          {/* Conversations */}
          <Route path="/conversations" element={<ConversationViewer />} />
          
          {/* Explore (placeholder) */}
          <Route 
            path="/explore" 
            element={
              <div className="p-8 text-center text-gray-400 animate-fade-in">
                <h2 className="text-2xl font-semibold mb-4">Explore Community Experiments</h2>
                <p>Discover and share experiments from the community.</p>
              </div>
            } 
          />
          
          {/* Catch-all route for 404 */}
          <Route 
            path="*" 
            element={
              <div className="p-8 text-center animate-fade-in">
                <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                  <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                    Page Not Found
                  </h2>
                  <p style={{ color: 'var(--color-text-secondary)' }}>
                    The page you're looking for doesn't exist.
                  </p>
                </div>
              </div>
            } 
          />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

/**
 * Route paths as constants for consistent navigation
 */
export const ROUTES = {
  HOME: '/',
  NEW_EXPERIMENT: '/',
  LIVE_EXPERIMENTS: '/live-experiments',
  HISTORY: '/history',
  MODELS: '/models',
  SETTINGS: '/settings',
  ABOUT: '/about',
  CONVERSATIONS: '/conversations',
  EXPLORE: '/explore',
} as const;

/**
 * Type for route paths
 */
export type RoutePath = typeof ROUTES[keyof typeof ROUTES];
