import React from 'react';
import { Icon } from '../components/ui/Icon';

// This page component displays information about the application.
export const About: React.FC = () => {
  return (
    <div className="p-8 animate-fade-in">
      <div className="bg-gray-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3 mb-6">
          <Icon className="text-purple-400 text-xl"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></Icon>
          <h2 className="text-xl font-semibold text-white">What's LLaMa-Herd</h2>
        </div>
        <div className="text-gray-300 space-y-4 leading-relaxed">
          <p>
            LLaMa-Herd is an innovative multi-agent conversation platform that enables you to create, 
            configure, and orchestrate conversations between multiple AI agents. Built with modern web 
            technologies and designed for researchers, developers, and AI enthusiasts, it provides a 
            powerful environment for exploring multi-agent interactions and collaborative AI systems.
          </p>
          <p>
            The platform supports both live experiments with running agents and imported conversation 
            analysis. You can create custom agents with specific personalities, models, and behaviors, 
            then set them to work on tasks through iterative conversations. The system tracks all 
            interactions, making it easy to analyze patterns, improve agent configurations, and 
            understand how different AI models collaborate.
          </p>
          <p>
            Key features include real-time agent management, conversation history tracking, 
            customizable agent parameters, support for various Ollama models, and an intuitive 
            interface for monitoring and controlling multi-agent experiments. Whether you're 
            researching AI collaboration, testing conversational AI systems, or simply exploring 
            the possibilities of multi-agent conversations, LLaMa-Herd provides the tools you need.
          </p>
        </div>
      </div>
    </div>
  );
};
