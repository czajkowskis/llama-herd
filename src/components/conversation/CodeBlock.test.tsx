import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CodeBlock } from './CodeBlock';

// Mock clipboard API
const mockClipboard = {
  writeText: jest.fn(),
};

Object.assign(navigator, {
  clipboard: mockClipboard,
});

describe('CodeBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Inline code', () => {
    it('renders inline code correctly', () => {
      render(<CodeBlock inline>const foo = "bar";</CodeBlock>);
      const code = screen.getByText('const foo = "bar";');
      expect(code.tagName).toBe('CODE');
      expect(code).toHaveClass('rounded', 'px-1.5', 'py-0.5', 'text-sm', 'font-mono');
    });

    it('does not show copy button for inline code', () => {
      render(<CodeBlock inline>inline code</CodeBlock>);
      expect(screen.queryByText('Copy')).not.toBeInTheDocument();
    });
  });

  describe('Block code', () => {
    it('renders block code with toolbar', () => {
      const code = 'const x = 1;';
      const { container } = render(<CodeBlock className="language-javascript">{code}</CodeBlock>);
      
      expect(screen.getByText('javascript')).toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
      
      // Check code element contains the code
      const codeElement = container.querySelector('code');
      expect(codeElement).toHaveTextContent(code);
    });

    it('displays correct language label', () => {
      render(<CodeBlock className="language-python">print("hello")</CodeBlock>);
      expect(screen.getByText('python')).toBeInTheDocument();
    });

    it('defaults to "text" when no language is specified', () => {
      render(<CodeBlock>plain text</CodeBlock>);
      expect(screen.getByText('text')).toBeInTheDocument();
    });

    it('copies code to clipboard when copy button is clicked', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);
      const code = 'const x = 42;';
      
      render(<CodeBlock>{code}</CodeBlock>);
      
      const copyButton = screen.getByText('Copy').closest('button');
      fireEvent.click(copyButton!);
      
      expect(mockClipboard.writeText).toHaveBeenCalledWith(code);
      
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('resets "Copied!" message after 2 seconds', async () => {
      jest.useFakeTimers();
      mockClipboard.writeText.mockResolvedValue(undefined);
      
      render(<CodeBlock>test code</CodeBlock>);
      
      const copyButton = screen.getByText('Copy').closest('button');
      fireEvent.click(copyButton!);
      
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
      
      jest.advanceTimersByTime(2000);
      
      await waitFor(() => {
        expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
        expect(screen.getByText('Copy')).toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });

    it('handles copy error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockClipboard.writeText.mockRejectedValue(new Error('Copy failed'));
      
      render(<CodeBlock>test code</CodeBlock>);
      
      const copyButton = screen.getByText('Copy').closest('button');
      fireEvent.click(copyButton!);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to copy code:',
          expect.any(Error)
        );
      });
      
      consoleErrorSpy.mockRestore();
    });

    it('handles array children', () => {
      const codeLines = ['line 1', 'line 2', 'line 3'];
      render(<CodeBlock>{codeLines}</CodeBlock>);
      
      expect(screen.getByText('line 1line 2line 3')).toBeInTheDocument();
    });

    it('renders with proper structure for code blocks', () => {
      const { container } = render(<CodeBlock className="language-typescript">const x = 1;</CodeBlock>);
      
      // Check for toolbar
      const toolbar = container.querySelector('.relative.group');
      expect(toolbar).toBeInTheDocument();
      
      // Check for pre and code elements
      const pre = container.querySelector('pre');
      const code = container.querySelector('code');
      expect(pre).toBeInTheDocument();
      expect(code).toBeInTheDocument();
      expect(code?.classList.contains('language-typescript')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('has proper title attribute on copy button', () => {
      render(<CodeBlock>code</CodeBlock>);
      const copyButton = screen.getByTitle('Copy code');
      expect(copyButton).toBeInTheDocument();
    });

    it('shows appropriate icon based on copy state', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);
      const { container } = render(<CodeBlock>test</CodeBlock>);
      
      const copyButton = screen.getByText('Copy').closest('button');
      
      // Check for copy icon initially (rect element is part of copy icon)
      let icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
      
      fireEvent.click(copyButton!);
      
      // After clicking, should show checkmark icon
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });
  });
});
