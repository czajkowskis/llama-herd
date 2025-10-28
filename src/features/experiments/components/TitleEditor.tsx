import React from 'react';
import { Input } from '../../../components/ui/Input';
import { Icon } from '../../../components/ui/Icon';

interface TitleEditorProps {
  isEditing: boolean;
  title: string;
  editingTitle: string;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onChange: (title: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

export const TitleEditor: React.FC<TitleEditorProps> = ({
  isEditing,
  title,
  editingTitle,
  onStartEdit,
  onSave,
  onCancel,
  onChange,
  onKeyPress,
}) => {
  if (isEditing) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Title:</span>
        <div className="relative">
          <Input
            value={editingTitle}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyPress}
            onBlur={onSave}
            className="text-sm w-64 pr-16"
            autoFocus
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            <button
              onClick={onSave}
              className="p-1.5 rounded-full transition-colors duration-200"
              style={{ color: 'var(--color-success)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-success-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-success)';
              }}
              title="Save title"
            >
              <Icon>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              </Icon>
            </button>
            <button
              onClick={onCancel}
              style={{ color: 'var(--color-text-tertiary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-tertiary)'}
              className="p-1.5 rounded-full transition-colors duration-200"
              title="Cancel edit"
            >
              <Icon>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
                  <path d="M18 6 6 18"/>
                  <path d="m6 6 12 12"/>
                </svg>
              </Icon>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Title:</span>
      <Input
        value={title}
        readOnly
        className="text-sm w-64 cursor-pointer"
        style={{ 
          backgroundColor: 'var(--color-bg-tertiary)',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-border)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'}
        onClick={onStartEdit}
      />
    </div>
  );
};
