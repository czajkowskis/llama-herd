import html2canvas from 'html2canvas';

export interface ExportStyle {
  theme: 'dark' | 'light' | 'custom';
  backgroundColor: string;
  textColor: string;
  messageBackgroundColor: string;
  borderRadius: number;
  padding: number;
  fontSize: number;
  fontFamily: string;
  showTimestamps: boolean;
  showModels: boolean;
  showAgentAvatars: boolean;
  customCSS?: string;
}

export interface Message {
  id: string;
  agentId: string;
  content: string;
  timestamp: string;
}

export interface ConversationAgent {
  id: string;
  name: string;
  color: string;
  originalName?: string;
  model: string;
}

export const defaultExportStyle: ExportStyle = {
  theme: 'dark',
  backgroundColor: '#1f2937',
  textColor: '#ffffff',
  messageBackgroundColor: '#374151',
  borderRadius: 12,
  padding: 24,
  fontSize: 14,
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  showTimestamps: true,
  showModels: true,
  showAgentAvatars: true,
};

export const exportThemes = {
  dark: {
    backgroundColor: '#1f2937',
    textColor: '#ffffff',
    messageBackgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  light: {
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    messageBackgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  custom: {
    backgroundColor: '#1f2937',
    textColor: '#ffffff',
    messageBackgroundColor: '#374151',
    borderColor: '#4b5563',
  },
};

export class ExportService {
  static async exportAsPNG(
    element: HTMLElement,
    style: ExportStyle,
    filename: string = 'conversation'
  ): Promise<void> {
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: style.backgroundColor,
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting as PNG:', error);
      throw new Error('Failed to export as PNG');
    }
  }

  static async exportAsSVG(
    element: HTMLElement,
    style: ExportStyle,
    filename: string = 'conversation'
  ): Promise<void> {
    try {
      // Convert HTML to SVG using html2canvas first, then convert to SVG
      const canvas = await html2canvas(element, {
        backgroundColor: style.backgroundColor,
        scale: 1,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      // Create SVG wrapper
      const svg = this.canvasToSVG(canvas, style);
      
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = `${filename}.svg`;
      link.href = url;
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting as SVG:', error);
      throw new Error('Failed to export as SVG');
    }
  }

  static exportAsJSON(
    messages: Message[],
    agents: ConversationAgent[],
    filename: string = 'conversation'
  ): void {
    try {
      // Create a map of agent IDs to agent objects for quick lookup
      const agentMap = new Map(agents.map(agent => [agent.id, agent]));
      
      const exportData = {
        title: "Conversation Title", // You can customize this or make it dynamic
        messages: messages.map(message => {
          const agent = agentMap.get(message.agentId);
          return {
            agent: {
              name: agent?.name || 'Unknown',
              model: agent?.model || 'Unknown'
            },
            content: message.content,
            timestamp: message.timestamp
          };
        })
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = `${filename}.json`;
      link.href = url;
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting as JSON:', error);
      throw new Error('Failed to export as JSON');
    }
  }

  static exportAsText(
    messages: Message[],
    agents: ConversationAgent[],
    filename: string = 'conversation'
  ): void {
    try {
      let textContent = `Conversation Export\n`;
      textContent += `Generated: ${new Date().toLocaleString()}\n`;
      textContent += `Total Messages: ${messages.length}\n`;
      textContent += `Total Agents: ${agents.length}\n\n`;
      
      textContent += `Agents:\n`;
      agents.forEach(agent => {
        textContent += `- ${agent.name} (${agent.model})\n`;
      });
      
      textContent += `\nConversation:\n`;
      textContent += `==========================================\n\n`;
      
      messages.forEach(message => {
        const agent = agents.find(a => a.id === message.agentId);
        const timestamp = new Date(message.timestamp).toLocaleString();
        textContent += `[${timestamp}] ${agent?.name || 'Unknown'}:\n`;
        textContent += `${message.content}\n\n`;
      });

      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = `${filename}.txt`;
      link.href = url;
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting as text:', error);
      throw new Error('Failed to export as text');
    }
  }

  static exportAsMarkdown(
    messages: Message[],
    agents: ConversationAgent[],
    filename: string = 'conversation'
  ): void {
    try {
      let markdownContent = `# Conversation Export\n\n`;
      markdownContent += `**Generated:** ${new Date().toLocaleString()}\n`;
      markdownContent += `**Total Messages:** ${messages.length} | **Total Agents:** ${agents.length}\n\n`;
      markdownContent += `---\n\n`;

      messages.forEach(message => {
        const agent = agents.find(a => a.id === message.agentId);
        const timestamp = new Date(message.timestamp).toLocaleString();
        const agentName = agent?.name || 'Unknown';
        const model = agent?.model || 'Unknown';
        
        markdownContent += `### ${agentName} (${model})\n`;
        markdownContent += `*${timestamp}*\n\n`;
        markdownContent += `${message.content}\n\n`;
        markdownContent += `---\n\n`;
      });

      const blob = new Blob([markdownContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${filename}.md`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting as Markdown:', error);
      throw new Error('Failed to export as Markdown');
    }
  }

  private static canvasToSVG(canvas: HTMLCanvasElement, style: ExportStyle): string {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    const width = canvas.width;
    const height = canvas.height;
    
    // Get image data and convert to SVG
    const imageData = ctx.getImageData(0, 0, width, height);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const data = imageData.data;
    
    // Convert to base64
    const base64 = canvas.toDataURL('image/png');
    
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .conversation-export {
              font-family: ${style.fontFamily};
              font-size: ${style.fontSize}px;
            }
          </style>
        </defs>
        <rect width="100%" height="100%" fill="${style.backgroundColor}"/>
        <image href="${base64}" width="100%" height="100%"/>
      </svg>
    `;
  }

  static generateCustomCSS(style: ExportStyle): string {
    return `
      .conversation-export {
        font-family: ${style.fontFamily};
        font-size: ${style.fontSize}px;
        background-color: ${style.backgroundColor};
        color: ${style.textColor};
        padding: ${style.padding}px;
        border-radius: ${style.borderRadius}px;
      }
      
      .conversation-export .message {
        background-color: ${style.messageBackgroundColor};
        border-radius: ${Math.max(0, style.borderRadius - 4)}px;
        margin-bottom: 16px;
        padding: 16px;
      }
      
      .conversation-export .message-header {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
      }
      
      .conversation-export .agent-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        margin-right: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 14px;
      }
      
      .conversation-export .agent-name {
        font-weight: 600;
        margin-right: 8px;
      }
      
      .conversation-export .timestamp {
        font-size: 12px;
        opacity: 0.7;
      }
      
      .conversation-export .model-info {
        font-size: 12px;
        opacity: 0.6;
        margin-left: 8px;
      }
      
      .conversation-export .message-content {
        line-height: 1.6;
      }
      
      .conversation-export .message-content h1,
      .conversation-export .message-content h2,
      .conversation-export .message-content h3 {
        margin-top: 16px;
        margin-bottom: 8px;
        font-weight: 600;
      }
      
      .conversation-export .message-content p {
        margin-bottom: 8px;
      }
      
      .conversation-export .message-content ul,
      .conversation-export .message-content ol {
        margin-bottom: 8px;
        padding-left: 20px;
      }
      
      .conversation-export .message-content code {
        background-color: rgba(0, 0, 0, 0.2);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      }
      
      .conversation-export .message-content pre {
        background-color: rgba(0, 0, 0, 0.2);
        padding: 12px;
        border-radius: 6px;
        overflow-x: auto;
        margin: 12px 0;
      }
      
      .conversation-export .message-content a {
        color: #60a5fa;
        text-decoration: underline;
      }
    `;
  }
} 