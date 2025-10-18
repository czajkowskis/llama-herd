import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, ConversationAgent } from '../../types/index.d';
import { ExportService, ExportStyle, defaultExportStyle, exportThemes } from '../../services/exportService';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { SimpleColorPicker } from '../ui/SimpleColorPicker';
import { ConfirmationPopup } from '../ui/ConfirmationPopup';

interface ExportPanelProps {
  messages: Message[];
  agents: ConversationAgent[];
  getAgentById: (agentId: string) => ConversationAgent | undefined;
  formatTimestamp: (timestamp: string) => string;
  onClose: () => void;
  preselectedMessages?: Set<string>;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  messages,
  agents,
  getAgentById,
  formatTimestamp,
  onClose,
  preselectedMessages,
}) => {
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [exportStyle, setExportStyle] = useState<ExportStyle>(defaultExportStyle);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showStylePanel, setShowStylePanel] = useState(true);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportMetadata, setExportMetadata] = useState({
    includeMetadata: true,
    includeTimestamps: true,
    includeModels: true,
    includeAgentInfo: true,
    customFilename: '',
  });
  const [exportProgress, setExportProgress] = useState(0);
  const [savedTemplates, setSavedTemplates] = useState<Array<{
    id: string;
    name: string;
    style: ExportStyle;
    metadata: typeof exportMetadata;
    timestamp: string;
  }>>([]);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string>('');
  const previewRef = useRef<HTMLDivElement>(null);

  // Select messages: preselected ones if provided, otherwise all messages
  useEffect(() => {
    if (preselectedMessages && preselectedMessages.size > 0) {
      setSelectedMessages(new Set(preselectedMessages));
    } else {
      setSelectedMessages(new Set(messages.map(m => m.id)));
    }
  }, [messages, preselectedMessages]);

  // Load saved templates and export history from localStorage
  useEffect(() => {
    const loadSavedData = () => {
      try {
        const savedConfigs = JSON.parse(localStorage.getItem('llama-herd-export-configs') || '[]');
        setSavedTemplates(savedConfigs);
      } catch (error) {
        console.error('Error loading saved export data:', error);
      }
    };
    
    loadSavedData();
  }, []);

  const toggleMessageSelection = (messageId: string) => {
    const newSelection = new Set(selectedMessages);
    if (newSelection.has(messageId)) {
      newSelection.delete(messageId);
    } else {
      newSelection.add(messageId);
    }
    setSelectedMessages(newSelection);
  };

  const removeMessageFromExport = (messageId: string) => {
    const newSelection = new Set(selectedMessages);
    newSelection.delete(messageId);
    setSelectedMessages(newSelection);
  };

  const selectAllMessages = () => {
    setSelectedMessages(new Set(messages.map(m => m.id)));
  };

  const deselectAllMessages = () => {
    setSelectedMessages(new Set());
  };

  const handleThemeChange = (theme: 'dark' | 'light' | 'custom') => {
    const themeColors = exportThemes[theme];
    setExportStyle(prev => ({
      ...prev,
      theme,
      backgroundColor: themeColors.backgroundColor,
      textColor: themeColors.textColor,
      messageBackgroundColor: themeColors.messageBackgroundColor,
    }));
  };

  const handleExport = async (format: 'png' | 'svg' | 'json') => {
    if (selectedMessages.size === 0) {
      setExportError('Please select at least one message to export');
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setExportProgress(0);

    try {
      const baseFilename = exportMetadata.customFilename || `conversation-export-${new Date().toISOString().split('T')[0]}`;
      const filteredMessages = messages.filter(m => selectedMessages.has(m.id));
      
      if (format === 'png') {
        if (!previewRef.current) {
          throw new Error('Preview element not found');
        }
        setExportProgress(25);
        await ExportService.exportAsPNG(previewRef.current, exportStyle, baseFilename);
        setExportProgress(100);
      } else if (format === 'svg') {
        if (!previewRef.current) {
          throw new Error('Preview element not found');
        }
        setExportProgress(25);
        await ExportService.exportAsSVG(previewRef.current, exportStyle, baseFilename);
        setExportProgress(100);
      } else if (format === 'json') {
        setExportProgress(50);
        ExportService.exportAsJSON(filteredMessages, agents, baseFilename);
        setExportProgress(100);
      }
    } catch (error: any) {
      setExportError(error.message || 'Export failed');
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 1000);
    }
  };

  const filteredMessages = messages.filter(m => selectedMessages.has(m.id));

  const saveExportConfiguration = () => {
    const config = {
      id: `config-${Date.now()}`,
      name: `Custom Config ${new Date().toLocaleDateString()}`,
      style: exportStyle,
      metadata: exportMetadata,
      timestamp: new Date().toISOString()
    };
    
    const savedConfigs = JSON.parse(localStorage.getItem('llama-herd-export-configs') || '[]');
    savedConfigs.push(config);
    localStorage.setItem('llama-herd-export-configs', JSON.stringify(savedConfigs));
    
    // Update local state
    setSavedTemplates(prev => [...prev, config]);
    
    // Show success message
    setExportError(null);
    // You could add a success toast here
  };

  const loadTemplate = (template: typeof savedTemplates[0]) => {
    setExportStyle(template.style);
    setExportMetadata(template.metadata);
  };

  const deleteTemplate = (templateId: string) => {
    setTemplateToDelete(templateId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (templateToDelete) {
      const savedConfigs = JSON.parse(localStorage.getItem('llama-herd-export-configs') || '[]');
      const updatedConfigs = savedConfigs.filter((config: any) => config.id !== templateToDelete);
      localStorage.setItem('llama-herd-export-configs', JSON.stringify(updatedConfigs));
      
      setSavedTemplates(prev => prev.filter(template => template.id !== templateToDelete));
      setShowDeleteConfirm(false);
      setTemplateToDelete('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Icon className="text-purple-400 text-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </Icon>
            <h2 className="text-xl font-semibold text-white">Export Conversation</h2>
          </div>
          <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">
            Close
          </Button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Panel - Message Selection and Styling */}
          <div className="w-80 border-r border-gray-700 p-6 overflow-y-auto">
            {/* Message Selection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-white">Select Messages</h3>
                <div className="flex space-x-2">
                  <Button onClick={selectAllMessages} className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-700">
                    All
                  </Button>
                  <Button onClick={deselectAllMessages} className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-700">
                    None
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {messages.map((message) => {
                  const agent = getAgentById(message.agentId);
                  return (
                    <label key={message.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-700 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedMessages.has(message.id)}
                        onChange={() => toggleMessageSelection(message.id)}
                        className="rounded border-gray-600 bg-gray-700 text-purple-400 focus:ring-purple-400"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: agent?.color || '#6b7280' }}
                          />
                          <span className="text-sm text-white truncate">{agent?.name || 'Unknown'}</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {message.content.substring(0, 50)}...
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Styling Options */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-white">Styling</h3>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setShowStylePanel(!showStylePanel)}
                    className="text-gray-400 hover:text-white transition-colors p-1"
                  >
                    <Icon>
                      {showStylePanel ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m18 15-6-6-6 6"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      )}
                    </Icon>
                  </button>
                </div>
              </div>
              
              {showStylePanel && (
                <div className="space-y-4">
                  {/* Theme Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
                    <select
                      value={exportStyle.theme}
                      onChange={(e) => handleThemeChange(e.target.value as 'dark' | 'light' | 'custom')}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  {/* Background Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Background Color</label>
                    <SimpleColorPicker
                      color={exportStyle.backgroundColor}
                      onChange={(color) => setExportStyle(prev => ({ ...prev, backgroundColor: color }))}
                      label="Background"
                    />
                  </div>

                  {/* Message Background Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Message Background</label>
                    <SimpleColorPicker
                      color={exportStyle.messageBackgroundColor}
                      onChange={(color) => setExportStyle(prev => ({ ...prev, messageBackgroundColor: color }))}
                      label="Message Background"
                    />
                  </div>

                  {/* Text Color */}
                  <div>
                    <label className="nowrap text-sm font-medium text-gray-300 mb-2">Text Color</label>
                    <SimpleColorPicker
                      color={exportStyle.textColor}
                      onChange={(color) => setExportStyle(prev => ({ ...prev, textColor: color }))}
                      label="Text"
                    />
                  </div>

                  {/* Font Size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Font Size: {exportStyle.fontSize}px
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="24"
                      value={exportStyle.fontSize}
                      onChange={(e) => setExportStyle(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  {/* Border Radius */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Border Radius: {exportStyle.borderRadius}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="24"
                      value={exportStyle.borderRadius}
                      onChange={(e) => setExportStyle(prev => ({ ...prev, borderRadius: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  {/* Padding */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Padding: {exportStyle.padding}px
                    </label>
                    <input
                      type="range"
                      min="8"
                      max="48"
                      value={exportStyle.padding}
                      onChange={(e) => setExportStyle(prev => ({ ...prev, padding: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  {/* Toggle Options */}
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportStyle.showTimestamps}
                        onChange={(e) => setExportStyle(prev => ({ ...prev, showTimestamps: e.target.checked }))}
                        className="rounded border-gray-600 bg-gray-700 text-purple-400 focus:ring-purple-400"
                      />
                      <span className="text-sm text-gray-300">Show Timestamps</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportStyle.showModels}
                        onChange={(e) => setExportStyle(prev => ({ ...prev, showModels: e.target.checked }))}
                        className="rounded border-gray-600 bg-gray-700 text-purple-400 focus:ring-purple-400"
                      />
                      <span className="text-sm text-gray-300">Show Models</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportStyle.showAgentAvatars}
                        onChange={(e) => setExportStyle(prev => ({ ...prev, showAgentAvatars: e.target.checked }))}
                        className="rounded border-gray-600 bg-gray-700 text-purple-400 focus:ring-purple-400"
                      />
                      <span className="text-sm text-gray-300">Show Agent Avatars</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Export Options */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-white">Export Options</h3>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setShowExportOptions(!showExportOptions)}
                      className="text-gray-400 hover:text-white transition-colors p-1"
                    >
                      <Icon>
                        {showExportOptions ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m18 15-6-6-6 6"/>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6"/>
                          </svg>
                        )}
                      </Icon>
                    </button>
                  </div>
                </div>
                
                {showExportOptions && (
                  <div className="space-y-3 p-3 bg-gray-700 rounded-lg">
                    {/* Custom Filename */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Custom Filename (optional)
                      </label>
                      <input
                        type="text"
                        value={exportMetadata.customFilename}
                        onChange={(e) => setExportMetadata(prev => ({ ...prev, customFilename: e.target.value }))}
                        placeholder="conversation-export"
                        className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm"
                      />
                    </div>

                    {/* Metadata Options */}
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={exportMetadata.includeMetadata}
                          onChange={(e) => setExportMetadata(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                          className="rounded border-gray-600 bg-gray-700 text-purple-400 focus:ring-purple-400"
                        />
                        <span className="text-sm text-gray-300">Include Export Metadata</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={exportMetadata.includeTimestamps}
                          onChange={(e) => setExportMetadata(prev => ({ ...prev, includeTimestamps: e.target.checked }))}
                          className="rounded border-gray-600 bg-gray-700 text-purple-400 focus:ring-purple-400"
                        />
                        <span className="text-sm text-gray-300">Include Timestamps</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={exportMetadata.includeModels}
                          onChange={(e) => setExportMetadata(prev => ({ ...prev, includeModels: e.target.checked }))}
                          className="rounded border-gray-600 bg-gray-700 text-purple-400 focus:ring-purple-400"
                        />
                        <span className="text-sm text-gray-300">Include Model Information</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={exportMetadata.includeAgentInfo}
                          onChange={(e) => setExportMetadata(prev => ({ ...prev, includeAgentInfo: e.target.checked }))}
                          className="rounded border-gray-600 bg-gray-700 text-purple-400 focus:ring-purple-400"
                        />
                        <span className="text-sm text-gray-300">Include Agent Details</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Template Manager */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-white">Saved Templates</h3>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setShowTemplateManager(!showTemplateManager)}
                      className="text-gray-400 hover:text-white transition-colors p-1"
                    >
                      <Icon>
                        {showTemplateManager ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m18 15-6-6-6 6"/>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6"/>
                          </svg>
                        )}
                      </Icon>
                    </button>
                  </div>
                </div>
                
                {showTemplateManager && (
                  <div className="space-y-3 p-3 bg-gray-700 rounded-lg">
                    {savedTemplates.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">
                        No saved templates yet. Save your current configuration to create one.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {savedTemplates.map((template) => (
                          <div key={template.id} className="flex items-center justify-between p-2 bg-gray-600 rounded">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white font-medium truncate">{template.name}</div>
                              <div className="text-xs text-gray-400">
                                {new Date(template.timestamp).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                onClick={() => loadTemplate(template)}
                                className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700"
                              >
                                Load
                              </Button>
                              <Button
                                onClick={() => deleteTemplate(template.id)}
                                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <Button
                      onClick={saveExportConfiguration}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Save Current Configuration
                    </Button>
                  </div>
                )}
              </div>

              {/* Progress Indicator */}
              {isExporting && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">Export Progress</span>
                    <span className="text-sm text-gray-400">{exportProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Export Summary */}
              <div className="mb-4 p-3 bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-300 mb-2">
                  <span className="font-medium">Export Summary:</span>
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>• {selectedMessages.size} message{selectedMessages.size !== 1 ? 's' : ''} selected</div>
                  <div>• {(() => {
                    const includedAgentIds = new Set(
                      Array.from(selectedMessages).map(messageId => {
                        const message = messages.find(m => m.id === messageId);
                        return message?.agentId;
                      }).filter(Boolean)
                    );
                    return `${includedAgentIds.size}/${agents.length} agent${agents.length !== 1 ? 's' : ''} included`;
                  })()}</div>
                  <div>• Filename: {exportMetadata.customFilename || 'conversation'}</div>
                </div>
              </div>

              <Button
                onClick={() => handleExport('png')}
                disabled={isExporting || selectedMessages.size === 0}
                className={`w-full mb-3 ${
                  selectedMessages.size === 0 
                    ? 'bg-gray-500 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700'
                } disabled:opacity-50`}
              >
                {isExporting ? 'Exporting...' : 'Export as PNG'}
              </Button>
              <Button
                onClick={() => handleExport('svg')}
                disabled={isExporting || selectedMessages.size === 0}
                className={`w-full mb-3 ${
                  selectedMessages.size === 0 
                    ? 'bg-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50`}
              >
                {isExporting ? 'Exporting...' : 'Export as SVG'}
              </Button>
              <Button
                onClick={() => handleExport('json')}
                disabled={isExporting || selectedMessages.size === 0}
                className={`w-full ${
                  selectedMessages.size === 0 
                    ? 'bg-gray-500 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700'
                } disabled:opacity-50`}
              >
                {isExporting ? 'Exporting...' : 'Export as JSON'}
              </Button>

              {exportError && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm">{exportError}</p>
                </div>
              )}
            </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 p-6 overflow-y-auto">
            <h3 className="text-lg font-medium text-white mb-4">Preview</h3>
            <div
              ref={previewRef}
              className="conversation-export"
              style={{
                backgroundColor: exportStyle.backgroundColor,
                color: exportStyle.textColor,
                padding: exportStyle.padding,
                borderRadius: exportStyle.borderRadius,
                fontFamily: exportStyle.fontFamily,
                fontSize: exportStyle.fontSize,
              }}
            >
              {filteredMessages.map((message) => {
                const agent = getAgentById(message.agentId);
                if (!agent) return null;

                return (
                  <div key={message.id} className="message" style={{ backgroundColor: exportStyle.messageBackgroundColor }}>
                    <div className="message-header">
                      {exportStyle.showAgentAvatars && (
                        <div
                          className="agent-avatar"
                          style={{ backgroundColor: agent.color }}
                        >
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <span className="agent-name">{agent.name}</span>
                        {exportStyle.showTimestamps && (
                          <span className="timestamp">{formatTimestamp(message.timestamp)}</span>
                        )}
                        {exportStyle.showModels && (
                          <span className="model-info">• {agent.model}</span>
                        )}
                      </div>
                      <button
                        onClick={() => removeMessageFromExport(message.id)}
                        className="text-gray-400 hover:text-red-400 transition-colors duration-200 p-1 rounded-full hover:bg-red-900/20"
                        title="Remove from export"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"/>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      </button>
                    </div>
                    <div className="message-content">
                      <ReactMarkdown
                        components={{
                          h1: (props: any) => (
                            <h1 className="text-xl font-semibold mt-2 mb-2" {...props} />
                          ),
                          h2: (props: any) => (
                            <h2 className="text-lg font-semibold mt-2 mb-2" {...props} />
                          ),
                          h3: (props: any) => (
                            <h3 className="text-base font-semibold mt-2 mb-2" {...props} />
                          ),
                          p: (props: any) => (
                            <p className="mb-2" {...props} />
                          ),
                          ul: (props: any) => (
                            <ul className="list-disc ml-6 mb-2" {...props} />
                          ),
                          ol: (props: any) => (
                            <ol className="list-decimal ml-6 mb-2" {...props} />
                          ),
                          li: (props: any) => (
                            <li className="mb-1" {...props} />
                          ),
                          a: (props: any) => (
                            <a className="underline" target="_blank" rel="noreferrer" {...props} />
                          ),
                          hr: (props: any) => (
                            <hr className="border-gray-700 my-3" {...props} />
                          ),
                          code: ({ node, inline, className, children, ...props }: any) => {
                            if (inline) {
                              return (
                                <code className="bg-gray-900 rounded px-1 py-0.5 text-sm" {...props}>
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <pre className="bg-gray-900 rounded-md p-3 overflow-x-auto text-sm">
                                <code className={className} {...props}>{children}</code>
                              </pre>
                            );
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      <ConfirmationPopup
        isOpen={showDeleteConfirm}
        title="Delete Template"
        message="Are you sure you want to delete this template? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setTemplateToDelete('');
        }}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}; 