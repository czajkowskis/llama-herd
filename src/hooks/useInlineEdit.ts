import { useState } from 'react';

export interface UseInlineEditResult {
  editingId: string | null;
  editingValue: string;
  startEdit: (id: string, value: string) => void;
  cancelEdit: () => void;
  saveEdit: () => void;
  setEditingValue: (value: string) => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
}

export const useInlineEdit = (
  onSave: (id: string, value: string) => void
): UseInlineEditResult => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  const startEdit = (id: string, value: string) => {
    setEditingId(id);
    setEditingValue(value);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const saveEdit = () => {
    if (editingId && editingValue.trim()) {
      onSave(editingId, editingValue.trim());
    }
    cancelEdit();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  return {
    editingId,
    editingValue,
    startEdit,
    cancelEdit,
    saveEdit,
    setEditingValue,
    handleKeyPress,
  };
};

