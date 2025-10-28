import React from 'react';
import { getStatusColor, getStatusIcon } from '../../utils/messageUtils';

interface StatusBadgeProps {
  status: string;
}

/**
 * Reusable status badge component for experiment status display
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getStatusColor(status)}`} style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
      {getStatusIcon(status)}
      <span className="text-sm font-medium capitalize">{status}</span>
    </div>
  );
};
