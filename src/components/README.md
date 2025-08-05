# Components Organization

This directory contains all React components organized into logical folders for better maintainability.

## Folder Structure

### `/ui/` - Basic UI Components
Reusable UI elements used throughout the application:
- `Button.tsx` - Standard button component
- `Input.tsx` - Text input component
- `Textarea.tsx` - Multi-line text input component
- `Icon.tsx` - Icon wrapper component
- `ColorPicker.tsx` - Color selection component

### `/experiment/` - Experiment Management
Components related to experiment creation and management:
- `TaskCreationSection.tsx` - Task creation and import interface
- `AgentCreationSection.tsx` - Agent creation and management interface
- `ExperimentStatus.tsx` - Experiment status display

### `/task/` - Task Management
Components for task-related functionality:
- `TaskCreateForm.tsx` - Form for creating new tasks
- `TaskImportForm.tsx` - Form for importing tasks from files
- `TaskDisplay.tsx` - Display component for existing tasks

### `/agent/` - Agent Management
Components for agent configuration and management:
- `AgentForm.tsx` - Form for creating/editing agents
- `AgentList.tsx` - List display for agents
- `AgentConfiguration.tsx` - Agent configuration interface

### `/conversation/` - Conversation Features
Components for conversation viewing and management:
- `ChatView.tsx` - Main chat interface
- `ConversationList.tsx` - List of conversations
- `ConversationTile.tsx` - Individual conversation display

### `/common/` - Shared Components
Common components used across multiple features:
- `ErrorDisplay.tsx` - Error message display
- `Sidebar.tsx` - Navigation sidebar
- `UploadInterface.tsx` - File upload interface

## Import Patterns

### Individual Component Imports
```typescript
import { Button } from './components/ui/Button';
import { TaskCreationSection } from './components/experiment/TaskCreationSection';
```

### Category Imports
```typescript
import { Button, Input, Icon } from './components/ui';
import { TaskCreateForm, TaskImportForm } from './components/task';
```

### All Components Import
```typescript
import { Button, TaskCreationSection, AgentForm } from './components';
```

## Benefits

1. **Logical Organization**: Components are grouped by functionality
2. **Easy Navigation**: Clear folder structure makes finding components simple
3. **Scalability**: Easy to add new components to appropriate folders
4. **Maintainability**: Related components are kept together
5. **Import Flexibility**: Multiple import patterns available
6. **Type Safety**: All imports are properly typed

## Adding New Components

1. Identify the appropriate folder based on component functionality
2. Create the component file in the correct folder
3. Update the folder's `index.ts` file to export the new component
4. Update the main `components/index.ts` if needed
5. Use the appropriate import pattern in consuming files 