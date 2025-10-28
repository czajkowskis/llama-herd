import React from 'react';
import ReactMarkdown from 'react-markdown';
import { CodeBlock } from '../../features/history/components/CodeBlock';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <ReactMarkdown
      components={{
        h1: (props: any) => (
          <h1 className="text-xl font-semibold mt-2 mb-2" style={{ color: 'var(--color-text-primary)' }} {...props} />
        ),
        h2: (props: any) => (
          <h2 className="text-lg font-semibold mt-2 mb-2" style={{ color: 'var(--color-text-primary)' }} {...props} />
        ),
        h3: (props: any) => (
          <h3 className="text-base font-semibold mt-2 mb-2" style={{ color: 'var(--color-text-primary)' }} {...props} />
        ),
        p: (props: any) => (
          <p className="mb-2 leading-relaxed" {...props} />
        ),
        ul: (props: any) => (
          <ul className="list-disc ml-6 mb-2 space-y-1" {...props} />
        ),
        ol: (props: any) => (
          <ol className="list-decimal ml-6 mb-2 space-y-1" {...props} />
        ),
        li: (props: any) => (
          <li className="mb-1" {...props} />
        ),
        a: (props: any) => (
          <a className="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noreferrer" {...props} />
        ),
        hr: (props: any) => (
          <hr className="my-4" style={{ borderColor: 'var(--color-border)' }} {...props} />
        ),
        code: ({ node, inline, className, children, ...props }: any) => (
          <CodeBlock inline={inline} className={className}>
            {children}
          </CodeBlock>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

