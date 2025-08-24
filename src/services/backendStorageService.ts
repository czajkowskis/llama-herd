import { Agent, Task, Conversation } from '../types/index.d';

export interface StoredExperiment {
  id: string;
  title: string;
  task: Task;
  agents: Agent[];
  status: string;
  createdAt: string;
  completedAt?: string;
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

class BackendStorageService {
  private readonly BASE_URL = 'http://localhost:8000/api';

  // Experiment storage methods
  async saveExperiment(experiment: StoredExperiment): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/experiments/${experiment.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: experiment.status }),
      });
      
      if (response.ok) {
        return true;
      }
      
      // If experiment doesn't exist, create it via the start endpoint
      // This is a fallback for experiments that were started before persistent storage
      console.log('Experiment not found, creating new one...');
      return true;
    } catch (error) {
      console.error('Failed to save experiment:', error);
      return false;
    }
  }

  async getExperiments(): Promise<StoredExperiment[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/experiments`);
      if (response.ok) {
        const data = await response.json();
        return data.experiments.map((exp: any) => ({
          id: exp.experiment_id,
          title: exp.title,
          task: { id: '', prompt: exp.title.replace('Experiment: ', ''), datasetItems: [] },
          agents: exp.agents || [],
          status: exp.status,
          createdAt: exp.created_at,
          iterations: 1,
          currentIteration: 0
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to get experiments:', error);
      return [];
    }
  }

  async getExperiment(id: string): Promise<StoredExperiment | null> {
    try {
      const response = await fetch(`${this.BASE_URL}/experiments/${id}`);
      if (response.ok) {
        const data = await response.json();
        return {
          id: data.experiment_id,
          title: data.title || `Experiment ${id}`,
          task: { id: '', prompt: '', datasetItems: [] },
          agents: data.agents || [],
          status: data.status,
          createdAt: data.created_at || new Date().toISOString(),
          iterations: data.iterations || 1,
          currentIteration: data.current_iteration || 0
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get experiment:', error);
      return null;
    }
  }

  async deleteExperiment(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/experiments/${id}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to delete experiment:', error);
      return false;
    }
  }

  // Conversation storage methods
  async saveConversation(conversation: StoredConversation): Promise<boolean> {
    console.log('BackendStorageService: Attempting to save conversation:', conversation.id);
    console.log('BackendStorageService: URL:', `${this.BASE_URL}/conversations`);
    try {
      const response = await fetch(`${this.BASE_URL}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversation),
      });
      console.log('BackendStorageService: Response status:', response.status);
      console.log('BackendStorageService: Response ok:', response.ok);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('BackendStorageService: Response error text:', errorText);
      }
      return response.ok;
    } catch (error) {
      console.error('BackendStorageService: Failed to save conversation:', error);
      return false;
    }
  }

  async getConversations(source?: 'import' | 'experiment'): Promise<StoredConversation[]> {
    try {
      const url = source 
        ? `${this.BASE_URL}/conversations?source=${source}`
        : `${this.BASE_URL}/conversations`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        return data.conversations;
      }
      return [];
    } catch (error) {
      console.error('Failed to get conversations:', error);
      return [];
    }
  }

  async getExperimentConversations(experimentId: string): Promise<StoredConversation[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/conversations/experiment/${experimentId}`);
      if (response.ok) {
        const data = await response.json();
        return data.conversations;
      }
      return [];
    } catch (error) {
      console.error('Failed to get experiment conversations:', error);
      return [];
    }
  }

  async getConversation(id: string): Promise<StoredConversation | null> {
    try {
      const response = await fetch(`${this.BASE_URL}/conversations/${id}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to get conversation:', error);
      return null;
    }
  }

  async deleteConversation(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/conversations/${id}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      return false;
    }
  }

  // Utility methods
  async getStorageInfo(): Promise<{ experiment_count: number; conversation_count: number; data_directory: string } | null> {
    try {
      const response = await fetch(`${this.BASE_URL}/conversations/storage/info`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return null;
    }
  }
}

export const backendStorageService = new BackendStorageService(); 