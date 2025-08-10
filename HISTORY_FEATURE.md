# History Feature Documentation

## Overview

The History feature provides persistent storage and viewing of both experiments and conversations, allowing users to access their past work without repeated imports. The feature includes:

- **Experiment History**: Tracks all experiments with their status, agents, and conversations
- **Conversation History**: Stores imported conversations and experiment results
- **Persistent Storage**: Uses localStorage to persist data across browser sessions
- **Unified View**: Single interface to browse both experiments and conversations

## Features

### 1. Experiment Persistence
- Experiments are automatically saved when started
- Status updates are tracked in real-time
- Completed experiments store their final conversation
- Experiments can be viewed, deleted, and their status monitored

### 2. Conversation Persistence
- Imported conversations are automatically saved
- Experiment results are saved as conversations
- Conversations can be viewed, deleted, and exported
- Source tracking (import vs experiment)

### 3. Local Storage
- Uses browser localStorage for persistence
- Survives browser refreshes and restarts
- Automatic data synchronization between components
- Efficient storage with JSON serialization

## Technical Implementation

### Storage Service (`src/services/storageService.ts`)
- Manages localStorage operations
- Handles both experiments and conversations
- Provides CRUD operations for all stored data
- Includes error handling and fallbacks

### History Page (`src/pages/History.tsx`)
- Tabbed interface for experiments and conversations
- Real-time status updates from backend
- Integration with existing ChatView component
- Responsive design with proper loading states

### Integration Points
- **NewExperiment**: Saves experiments when started
- **LiveExperimentView**: Saves completed conversations and status updates
- **ConversationViewer**: Saves imported conversations
- **App.tsx**: Routes to history page

## Data Flow

1. **Experiment Creation**
   ```
   User starts experiment → NewExperiment → storageService.saveExperiment()
   ```

2. **Experiment Execution**
   ```
   LiveExperimentView → WebSocket updates → storageService.saveExperiment()
   ```

3. **Conversation Import**
   ```
   User imports file → ConversationViewer → storageService.saveConversation()
   ```

4. **History Viewing**
   ```
   History page → storageService.getExperiments() + getConversations()
   ```

## Storage Schema

### StoredExperiment
```typescript
{
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
```

### StoredConversation
```typescript
{
  id: string;
  title: string;
  agents: ConversationAgent[];
  messages: Message[];
  createdAt: string;
  importedAt: string;
  source: 'import' | 'experiment';
  experimentId?: string;
}
```

## Usage

### Viewing History
1. Navigate to the History page from the sidebar
2. Switch between Experiments and Conversations tabs
3. Click "View" to see full conversations
4. Use "Delete" to remove items from history

### Automatic Persistence
- Experiments are saved automatically when started
- Conversations are saved when imported or when experiments complete
- No manual saving required

### Data Recovery
- All data persists across browser sessions
- Automatic synchronization with backend experiment status
- Graceful fallback to local data if backend is unavailable

## Benefits

1. **No Repeated Imports**: Once imported, conversations are always available
2. **Experiment Tracking**: Complete history of all experiments and their results
3. **Cross-Session Persistence**: Work survives browser restarts and refreshes
4. **Unified Access**: Single place to find all past work
5. **Automatic Backup**: Local storage provides backup of important conversations

## Future Enhancements

- Export/import of history data
- Search and filtering capabilities
- Cloud synchronization
- Conversation tagging and organization
- Bulk operations (delete multiple, export all)
- Data compression for large conversations 