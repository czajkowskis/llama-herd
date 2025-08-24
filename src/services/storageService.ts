import { Conversation, Agent, Task } from '../types/index.d';

export interface StoredExperiment {
  id: string;
  title: string;
  task: Task;
  agents: Agent[];
  status: string;
  createdAt: string;
  completedAt?: string;
  conversation?: Conversation;
  iterations: number;
  currentIteration: number;
}

export interface StoredConversation {
  id: string;
  title: string;
  agents: Conversation['agents'];
  messages: Conversation['messages'];
  createdAt: string;
  importedAt: string;
  source: 'import' | 'experiment';
  experiment_id?: string;
}

class StorageService {
  private readonly EXPERIMENTS_KEY = 'llama-herd-experiments';
  private readonly CONVERSATIONS_KEY = 'llama-herd-conversations';

  // Experiment storage methods
  saveExperiment(experiment: StoredExperiment): void {
    try {
      const experiments = this.getExperiments();
      const existingIndex = experiments.findIndex(e => e.id === experiment.id);
      
      if (existingIndex >= 0) {
        experiments[existingIndex] = experiment;
      } else {
        experiments.push(experiment);
      }
      
      localStorage.setItem(this.EXPERIMENTS_KEY, JSON.stringify(experiments));
    } catch (error) {
      console.error('Failed to save experiment:', error);
    }
  }

  getExperiments(): StoredExperiment[] {
    try {
      const stored = localStorage.getItem(this.EXPERIMENTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get experiments:', error);
      return [];
    }
  }

  getExperiment(id: string): StoredExperiment | null {
    const experiments = this.getExperiments();
    return experiments.find(e => e.id === id) || null;
  }

  deleteExperiment(id: string): void {
    try {
      const experiments = this.getExperiments();
      const filtered = experiments.filter(e => e.id !== id);
      localStorage.setItem(this.EXPERIMENTS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete experiment:', error);
    }
  }

  // Conversation storage methods
  saveConversation(conversation: StoredConversation): void {
    try {
      const conversations = this.getConversations();
      const existingIndex = conversations.findIndex(c => c.id === conversation.id);
      
      if (existingIndex >= 0) {
        conversations[existingIndex] = conversation;
      } else {
        conversations.push(conversation);
      }
      
      localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  }

  getConversations(): StoredConversation[] {
    try {
      const stored = localStorage.getItem(this.CONVERSATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get conversations:', error);
      return [];
    }
  }

  getConversation(id: string): StoredConversation | null {
    const conversations = this.getConversations();
    return conversations.find(c => c.id === id) || null;
  }

  deleteConversation(id: string): void {
    try {
      const conversations = this.getConversations();
      const filtered = conversations.filter(c => c.id !== id);
      localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }

  // Utility methods
  clearAll(): void {
    try {
      localStorage.removeItem(this.EXPERIMENTS_KEY);
      localStorage.removeItem(this.CONVERSATIONS_KEY);
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  getStorageSize(): { experiments: number; conversations: number } {
    return {
      experiments: this.getExperiments().length,
      conversations: this.getConversations().length
    };
  }
}

export const storageService = new StorageService(); 