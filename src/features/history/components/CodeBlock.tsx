import React, { useState } from 'react';
import { Icon } from '../../../components/ui/Icon';

interface CodeBlockProps {
  children: string | string[];
  className?: string;
  inline?: boolean;
}

/**
 * CodeBlock component with copy functionality
 * Renders code blocks with syntax highlighting support and a copy button
 */
export const CodeBlock: React.FC<CodeBlockProps> = ({ children, className, inline }) => {
  const [copied, setCopied] = useState(false);

  // Extract language from className (format: language-xxx)
  const language = className?.replace(/language-/, '') || 'text';
  
  // Convert children to string
  const codeString = Array.isArray(children) ? children.join('') : children;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Inline code (backticks)
  if (inline) {
    return (
      <code 
        className="rounded px-1.5 py-0.5 text-sm font-mono"
        style={{ 
          backgroundColor: 'var(--color-bg-tertiary)',
          color: 'var(--color-text-primary)'
        }}
      >
        {children}
      </code>
    );
  }

  // Block code (triple backticks)
  return (
    <div className="relative group my-4">
      {/* Toolbar with language label and copy button */}
      <div 
        className="flex items-center justify-between px-4 py-2 rounded-t-md border-b"
        style={{ 
          backgroundColor: 'var(--color-bg-tertiary)',
          borderColor: 'var(--color-border)'
        }}
      >
        <span 
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 px-2 py-1 rounded text-xs transition-all duration-200 hover:bg-gray-700/50"
          style={{ color: copied ? '#10b981' : 'var(--color-text-secondary)' }}
          title="Copy code"
        >
          <Icon>
            {copied ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            )}
          </Icon>
          <span className="font-medium">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Code content */}
      <pre 
        className="rounded-b-md p-4 overflow-x-auto text-sm font-mono"
        style={{ 
          backgroundColor: 'var(--color-bg-primary)',
          color: 'var(--color-text-secondary)'
        }}
      >
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
};
