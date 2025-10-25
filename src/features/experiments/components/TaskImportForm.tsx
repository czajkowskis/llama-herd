import React, { useState } from 'react';
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
  const [expectedSolutionRegex, setExpectedSolutionRegex] = useState<string>('');
  const [showErrorPopup, setShowErrorPopup] = useState<boolean>(false);
  const [errorPopupMessage, setErrorPopupMessage] = useState<string>('');
  const [showConfirmPopup, setShowConfirmPopup] = useState<boolean>(false);
  const [pendingTask, setPendingTask] = useState<Task | null>(null);

  const handleImportTask = async () => {
    if (importedTaskFile) {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const parsedTask = JSON.parse(content);
            if (Array.isArray(parsedTask) && parsedTask.every(t => t.task && t.answer)) {
              const taskId = `imported-task-${Date.now()}`;
              const newTask: Task = {
                id: taskId,
                prompt: `Imported task with ${parsedTask.length} items.`,
                datasetItems: parsedTask,
                expectedSolutionRegex: expectedSolutionRegex || undefined,
              };
              
              // Show confirmation popup instead of window.confirm
              setPendingTask(newTask);
              setShowConfirmPopup(true);
            } else {
              setErrorPopupMessage('Invalid file format. The file should contain an array of objects with "task" and "answer" properties.');
              setShowErrorPopup(true);
            }
          } catch (error) {
            setErrorPopupMessage('Failed to parse the JSON file. Please check the file format.');
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
      setExpectedSolutionRegex('');
      setPendingTask(null);
      setShowConfirmPopup(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up p-6 mb-8">
      <p className="text-gray-300 mb-6 leading-relaxed">
        You can import the dataset as a json file. It should include the list of objects with two properties -
        task and answer. If you want the results to be automatically computed enter the expected format of
        the solution (as a regex) that could be found in the last message in the conversation. Make sure too
        specify the output format for your agents so it can be retrived automatically.
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
              type="file"
              className="hidden"
              accept=".json"
              onChange={(e) => setImportedTaskFile(e.target.files ? e.target.files[0] : null)}
            />
          </label>
          {importedTaskFile && <p className="text-sm text-gray-400 mt-2">Selected: {importedTaskFile.name}</p>}
        </div>
        <div className="flex-1 p-4">
          <label htmlFor="regex-input" className="block text-gray-300 text-sm mb-3 font-medium">
            Expected solution format (regex)
          </label>
          <Input
            id="regex-input"
            placeholder="e.g., ^FINAL SOLUTION:.*$"
            value={expectedSolutionRegex}
            onChange={(e) => setExpectedSolutionRegex(e.target.value)}
          />
          

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
        message={`Confirm task import?\n\nFile: ${pendingTask ? pendingTask.prompt : ''}\nItems: ${pendingTask?.datasetItems?.length || 0}\nIterations: ${pendingTask?.datasetItems?.length || 1} (auto-set from dataset)\n\nClick Confirm to import or Cancel to abort.`}
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