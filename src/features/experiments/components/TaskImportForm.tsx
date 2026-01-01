import React, { useState, useRef } from 'react';
import { Icon } from '../../../components/ui/Icon';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ErrorPopup } from '../../../components/ui/ErrorPopup';
import { ConfirmationPopup } from '../../../components/ui/ConfirmationPopup';
import { Task } from '../../../types/index.d';

interface TaskImportFormProps {
  onTaskImport: (task: Task) => void;
}

export const TaskImportForm: React.FC<TaskImportFormProps> = ({ onTaskImport }) => {
  const [importedTaskFile, setImportedTaskFile] = useState<File | null>(null);
  const [showErrorPopup, setShowErrorPopup] = useState<boolean>(false);
  const [errorPopupMessage, setErrorPopupMessage] = useState<string>('');
  const [showConfirmPopup, setShowConfirmPopup] = useState<boolean>(false);
  const [pendingTask, setPendingTask] = useState<Task | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChangeFile = () => {
    setImportedTaskFile(null);
    setPendingTask(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const validateAndNormalizeTaskItems = (items: any[]): { task: string; answer?: string }[] => {
    const normalized: { task: string; answer?: string }[] = [];
    const errors: string[] = [];

    items.forEach((item, index) => {
      // Validate task field exists and is a string
      if (!item || typeof item !== 'object') {
        errors.push(`Item ${index + 1}: Must be an object`);
        return;
      }

      if (!('task' in item)) {
        errors.push(`Item ${index + 1}: Missing required "task" property`);
        return;
      }

      // Validate task is a string and not empty after trimming
      const taskValue = item.task;
      if (typeof taskValue !== 'string') {
        errors.push(`Item ${index + 1}: "task" must be a string, got ${typeof taskValue}`);
        return;
      }

      const trimmedTask = taskValue.trim();
      if (!trimmedTask) {
        errors.push(`Item ${index + 1}: "task" cannot be empty`);
        return;
      }

      // Validate answer field if present
      let normalizedAnswer: string | undefined = undefined;
      if ('answer' in item && item.answer !== null && item.answer !== undefined) {
        if (typeof item.answer !== 'string') {
          errors.push(`Item ${index + 1}: "answer" must be a string if provided, got ${typeof item.answer}`);
          return;
        }
        normalizedAnswer = item.answer.trim() || undefined;
      }

      normalized.push({
        task: trimmedTask,
        answer: normalizedAnswer,
      });
    });

    if (errors.length > 0) {
      throw new Error(`Validation errors:\n${errors.join('\n')}`);
    }

    return normalized;
  };

  const handleImportTask = async () => {
    if (importedTaskFile) {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const parsedData = JSON.parse(content);
            
            // Validate it's an array
            if (!Array.isArray(parsedData)) {
              setErrorPopupMessage('Invalid file format. The file should contain an array of objects with "task" property.');
              setShowErrorPopup(true);
              return;
            }

            // Validate array is not empty
            if (parsedData.length === 0) {
              setErrorPopupMessage('The file contains an empty array. Please provide at least one task item.');
              setShowErrorPopup(true);
              return;
            }

            // Validate and normalize all items
            const normalizedItems = validateAndNormalizeTaskItems(parsedData);

            // Check if any items were filtered out (shouldn't happen with strict validation, but just in case)
            if (normalizedItems.length === 0) {
              setErrorPopupMessage('No valid task items found after validation. Please check your file format.');
              setShowErrorPopup(true);
              return;
            }

            const taskId = `imported-task-${Date.now()}`;
            const newTask: Task = {
              id: taskId,
              prompt: `Imported dataset with ${normalizedItems.length} task${normalizedItems.length !== 1 ? 's' : ''}.`,
              datasetItems: normalizedItems,
            };
            
            // Show confirmation popup instead of window.confirm
            setPendingTask(newTask);
            setShowConfirmPopup(true);
          } catch (error) {
            if (error instanceof Error) {
              setErrorPopupMessage(error.message);
            } else {
              setErrorPopupMessage('Failed to parse the JSON file. Please check the file format.');
            }
            setShowErrorPopup(true);
          }
        };
        reader.readAsText(importedTaskFile);
      } catch (error) {
        setErrorPopupMessage('Failed to read the file. Please try again.');
        setShowErrorPopup(true);
      }
    } else {
      setErrorPopupMessage('Please select a file to import.');
      setShowErrorPopup(true);
    }
  };

  const handleConfirmImport = () => {
    if (pendingTask) {
      onTaskImport(pendingTask);
      setImportedTaskFile(null);
      setPendingTask(null);
      setShowConfirmPopup(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up p-6 mb-8">
      <p className="mb-6 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
        You can import the dataset as a JSON file. It should include the list of objects with a "task" property (as shown below).
      </p>
      <div className="flex items-center space-x-6">
        <div className="flex-1 p-12 border-2 border-dashed border-gray-600 rounded-xl text-center cursor-pointer hover:border-purple-500 transition-all duration-200">
          <label htmlFor="file-upload" className="block text-purple-400 text-lg font-semibold cursor-pointer">
            Import the task
            <Icon className="mt-2 mx-auto text-3xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-upload">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" x2="12" y1="3" y2="15"/>
              </svg>
            </Icon>
            <input
              id="file-upload"
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".json"
              onChange={(e) => setImportedTaskFile(e.target.files ? e.target.files[0] : null)}
            />
          </label>
          {importedTaskFile && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Selected: {importedTaskFile.name}
              </p>
              <button
                onClick={handleChangeFile}
                className="text-sm text-purple-400 hover:text-purple-300 underline"
                type="button"
              >
                Change
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end">
        <Button 
          onClick={handleImportTask}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          Import Task
        </Button>
      </div>

      <div className="mt-8 text-sm text-gray-400 text-left max-w-4xl mx-auto">
        <h4 className="text-lg font-semibold mb-4 text-white text-center">Expected JSON format:</h4>
        <div className="bg-gray-900 p-6 rounded-lg text-sm overflow-x-auto text-left font-mono">
          <div className="text-gray-300">
            <span className="text-purple-400">[</span>
            <br />
            <span className="text-gray-400 ml-4"><span className="text-purple-400">{`{`}</span></span>
            <br />
            <span className="text-gray-400 ml-8">"task": <span className="text-green-400">"Task description or question"</span></span>
            <br />
            <span className="text-gray-400 ml-4"><span className="text-purple-400">{`}`}</span>,</span>
            <br />
            <span className="text-gray-400 ml-4"><span className="text-purple-400">{`{`}</span></span>
            <br />
            <span className="text-gray-400 ml-8">"task": <span className="text-green-400">"Another task description"</span></span>
            <br />
            <span className="text-gray-400 ml-4"><span className="text-purple-400">{`}`}</span></span>
            <br />
            <span className="text-purple-400">]</span>
          </div>
        </div>
      </div>
      
      <ErrorPopup
        isOpen={showErrorPopup}
        title="Import Error"
        message={errorPopupMessage}
        onClose={() => setShowErrorPopup(false)}
        type="error"
      />
      
      <ConfirmationPopup
        isOpen={showConfirmPopup}
        title="Confirm Task Import"
        message={`Import ${pendingTask?.datasetItems?.length || 0} task${(pendingTask?.datasetItems?.length || 0) !== 1 ? 's' : ''} from "${importedTaskFile?.name || 'file'}"?`}
        onConfirm={handleConfirmImport}
        onCancel={() => {
          setShowConfirmPopup(false);
          setPendingTask(null);
        }}
        confirmText="Import"
        cancelText="Cancel"
        type="info"
      />
    </div>
  );
}; 