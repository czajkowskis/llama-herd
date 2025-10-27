import React from 'react';

export const MessagePreview: React.FC = () => {
  return (
    <div className="mt-6">
      <label className="block text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>Preview</label>
      <div className="rounded-xl p-4 space-y-2" data-testid="preview-area" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="preview-message message-container rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="flex space-x-3">
            <div className="agent-avatar flex-shrink-0 w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-sm font-semibold text-white">
              A
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Agent Name</div>
              <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>This is a preview message showing the current density and compact mode settings.</div>
            </div>
          </div>
        </div>
        <div className="preview-message message-container rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="flex space-x-3">
            <div className="agent-avatar flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold text-white">
              B
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Another Agent</div>
              <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>The preview updates in real-time as you change settings.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

