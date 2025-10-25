import React, { useState, useRef } from 'react';
import { Icon } from '../ui/Icon';
import { ErrorDisplay } from './ErrorDisplay';

interface UploadInterfaceProps {
  conversations: any[];
  isUploading: boolean;
  uploadError: string | null;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UploadInterface: React.FC<UploadInterfaceProps> = ({
  conversations,
  isUploading,
  uploadError,
  onFileUpload
}) => {
  return (
    <div className="text-center py-12">
      <div className="mb-6">
        <Icon className="text-6xl text-gray-400 mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-upload">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
        </Icon>
        <h3 className="text-lg font-medium text-gray-200 mb-2">
          {conversations.length > 0 ? 'Add More Conversations' : 'Upload Conversations'}
        </h3>
        <p className="text-gray-400 mb-6">
          Upload JSON files containing multiagent conversations to view them in a chat-style interface.
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <label htmlFor="conversation-upload" className="block w-full p-8 border-2 border-dashed border-gray-600 rounded-xl text-center cursor-pointer hover:border-purple-500 transition-all duration-200">
          <input
            id="conversation-upload"
            type="file"
            className="hidden"
            accept=".json"
            multiple
            onChange={onFileUpload}
            disabled={isUploading}
          />
          <Icon className="text-3xl text-purple-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
              <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
              <path d="M10 9H8"/>
              <path d="M16 13H8"/>
              <path d="M16 17H8"/>
            </svg>
          </Icon>
          <div className="text-purple-400 font-semibold">
            {isUploading ? 'Processing...' : 'Choose JSON files'}
          </div>
          <div className="text-sm text-gray-400 mt-2">
            {isUploading ? 'Please wait while we process your conversations' : 'Click to browse or drag and drop (multiple files supported)'}
          </div>
        </label>
      </div>

      <ErrorDisplay uploadError={uploadError} />

      <div className="mt-8 text-sm text-gray-400 text-left max-w-4xl mx-auto">
        <h4 className="text-lg font-semibold mb-4 text-white text-center">Expected JSON format:</h4>
        <div className="bg-gray-900 p-6 rounded-lg text-sm overflow-x-auto text-left font-mono">
          <div className="text-gray-300">
            <span className="text-purple-400">{`{`}</span>
            <br />
            <span className="text-gray-400 ml-4">"title": <span className="text-green-400">"Conversation Title"</span>,</span>
            <br />
            <span className="text-gray-400 ml-4">"messages": <span className="text-purple-400">[</span></span>
            <br />
            <span className="text-gray-400 ml-8"><span className="text-purple-400">{`{`}</span></span>
            <br />
            <span className="text-gray-400 ml-12">"agent": <span className="text-purple-400">{`{`}</span></span>
            <br />
            <span className="text-gray-400 ml-16">"name": <span className="text-green-400">"Agent Name"</span>,</span>
            <br />
            <span className="text-gray-400 ml-16">"model": <span className="text-green-400">"llama2:7b"</span> <span className="text-gray-500">(optional)</span></span>
            <br />
            <span className="text-gray-400 ml-12"><span className="text-purple-400">{`}`}</span>,</span>
            <br />
            <span className="text-gray-400 ml-12"><span className="text-purple-400">{`}`}</span>,</span>
            <br />
            <span className="text-gray-400 ml-12">"content": <span className="text-green-400">"Agent message content"</span>,</span>
            <br />
            <span className="text-gray-400 ml-12">"timestamp": <span className="text-green-400">"2024-01-01T12:00:00.000Z"</span></span>
            <br />
            <span className="text-gray-400 ml-8"><span className="text-purple-400">{`}`}</span></span>
            <br />
            <span className="text-gray-400 ml-4"><span className="text-purple-400">]</span></span>
            <br />
            <span className="text-purple-400">{`}`}</span>
          </div>
          <br />
          <div className="text-gray-300 mt-4">
            <span className="text-blue-400">Optional model information:</span>
            <br />
            <span className="text-gray-400">Model can be specified in the agent object (preferred) or directly in the message:</span>
            <br />
            <span className="text-purple-400">{`{`}</span>
            <br />
            <span className="text-gray-400 ml-4">"agent": <span className="text-purple-400">{`{ "name": "Agent Name", "model": "llama2:7b" }`}</span>,</span>
            <br />
            <span className="text-gray-400 ml-4">"model": <span className="text-green-400">"llama2:7b"</span>,</span>
            <br />
            <span className="text-gray-400 ml-4">"content": <span className="text-green-400">"Message content"</span>,</span>
            <br />
            <span className="text-gray-400 ml-4">"timestamp": <span className="text-green-400">"2024-01-01T12:00:00.000Z"</span></span>
            <br />
            <span className="text-purple-400">{`}`}</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 