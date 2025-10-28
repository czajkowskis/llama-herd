import React from 'react';

/**
 * Utility functions for message formatting and display
 */

/**
 * Calculate contrast color (black or white) for a given background color
 */
export const getContrastColor = (backgroundColor: string): string => {
  // Convert hex to RGB
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

/**
 * Format timestamp for display
 */
export const formatTimestamp = (timestamp: string): string => {
  // Respect user preference or locale
  try {
    // lazy import to avoid circular issues in tests
    const { formatTimeShort } = require('../services/dateTimeService');
    return formatTimeShort(timestamp);
  } catch {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
};

/**
 * Get status color class for experiment status
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'running':
      return 'text-yellow-400';
    case 'completed':
      return 'text-green-400';
    case 'error':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
};

/**
 * Get status icon SVG for experiment status
 */
export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'running':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
      );
    case 'completed':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
      );
    case 'error':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      );
  }
};
