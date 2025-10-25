# Components Organization

This directory contains shared UI components and common components used throughout the application.

## Folder Structure

### `/ui/` - Basic UI Components
Reusable UI elements used throughout the application:
- `Button.tsx` - Standard button component
- `Input.tsx` - Text input component
- `Textarea.tsx` - Multi-line text input component
- `Icon.tsx` - Icon wrapper component
- `ColorPicker.tsx` - Color selection component

### `/common/` - Shared Components
Common components used across multiple features:
- `ErrorDisplay.tsx` - Error message display
- `Sidebar.tsx` - Navigation sidebar
- `UploadInterface.tsx` - File upload interface

## Feature-Based Organization

The application now uses a feature-based architecture where components are organized by feature:

- `/features/models/` - Model management components
- `/features/history/` - History and conversation components  
- `/features/experiments/` - Experiment creation and management components

## Import Patterns

### Individual Component Imports
```typescript
import { Button } from './components/ui/Button';
import { Sidebar } from './components/common/Sidebar';
```

### Category Imports
```typescript
import { Button, Input, Icon } from './components/ui';
import { ErrorDisplay, Sidebar } from './components/common';
```

### Feature Imports
```typescript
import { ModelsPage, DiscoverModels } from './features/models';
import { HistoryPage, ChatView } from './features/history';
import { NewExperimentPage, LiveExperimentView } from './features/experiments';
```

## Benefits

1. **Feature-Based Organization**: Components are grouped by feature for better maintainability
2. **Clear Separation**: UI components are separated from feature-specific components
3. **Easy Navigation**: Clear folder structure makes finding components simple
4. **Scalability**: Easy to add new features and components
5. **Maintainability**: Related components are kept together within features
6. **Import Flexibility**: Multiple import patterns available
7. **Type Safety**: All imports are properly typed

## Adding New Components

1. For UI components: Add to `/ui/` or `/common/` as appropriate
2. For feature components: Add to the appropriate feature directory
3. Update the relevant `index.ts` file to export the new component
4. Use the appropriate import pattern in consuming files 