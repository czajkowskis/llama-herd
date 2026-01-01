import React from 'react';
import { Icon } from '../components/ui/Icon';

// This page component displays information about the application.
export const About: React.FC = () => {
  return (
    <div className="p-8 animate-fade-in space-y-6">
      {/* Overview Section */}
      <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="flex items-center space-x-3 mb-6">
          <Icon className="text-purple-400 text-xl"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></Icon>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>What's LLaMa-Herd</h2>
        </div>
        <div className="space-y-4 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          <p>
            LLaMa-Herd is a multi-agent conversation platform that lets you create, configure, and 
            orchestrate conversations between multiple AI agents. You can run live experiments with 
            multiple agents working together, or analyze imported conversations to understand how 
            different AI models interact and collaborate.
          </p>
        </div>
      </div>

      {/* Key Features Section */}
      <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="flex items-center space-x-3 mb-6">
          <Icon className="text-purple-400 text-xl"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg></Icon>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Key Features</h2>
        </div>
        <div className="space-y-4" style={{ color: 'var(--color-text-secondary)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <Icon className="text-blue-400 mt-0.5"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></Icon>
              <div>
                <h3 className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Multi-Agent Experiments</h3>
                <p className="text-sm">Create and run conversations with multiple AI agents working together.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Icon className="text-green-400 mt-0.5"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-activity"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></Icon>
              <div>
                <h3 className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Real-time Monitoring</h3>
                <p className="text-sm">Watch experiments as they happen with live updates.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Icon className="text-yellow-400 mt-0.5"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-database"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/></svg></Icon>
              <div>
                <h3 className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Model Management</h3>
                <p className="text-sm">Download and manage Ollama models with progress tracking.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Icon className="text-purple-400 mt-0.5"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book-text"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h8"/></svg></Icon>
              <div>
                <h3 className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>History & Analysis</h3>
                <p className="text-sm">Review past experiments and conversations.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Icon className="text-orange-400 mt-0.5"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-upload"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg></Icon>
              <div>
                <h3 className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Import/Export</h3>
                <p className="text-sm">Bring in conversations and export your data.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Icon className="text-pink-400 mt-0.5"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></Icon>
              <div>
                <h3 className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Custom Agents</h3>
                <p className="text-sm">Configure agents with different personalities and models.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Technology Section */}
      <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="flex items-center space-x-3 mb-4">
          <Icon className="text-purple-400 text-xl"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-code"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></Icon>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Built With</h2>
        </div>
        <div style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">
            LLaMa-Herd is built with React and FastAPI, uses Ollama for local AI models, and supports Docker deployment.
          </p>
        </div>
      </div>
    </div>
  );
};
