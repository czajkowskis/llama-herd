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
  scale?: number; // Quality multiplier (1x, 2x, 3x, 4x)
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
  scale: 2,
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

export interface ProgressCallback {
  (progress: number): void;
}

export interface CanvasRendererOptions {
  messages: Message[];
  agents: ConversationAgent[];
  style: ExportStyle;
  getAgentById: (agentId: string) => ConversationAgent | undefined;
  formatTimestamp: (timestamp: string) => string;
  onProgress?: ProgressCallback;
  abortController?: AbortController;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: CanvasRendererOptions;
  private scale: number;
  private padding: number;
  private fontSize: number;
  private fontFamily: string;
  private lineHeight: number;
  private messageSpacing: number;
  private avatarSize: number;
  private borderRadius: number;

  constructor(options: CanvasRendererOptions) {
    this.options = options;
    this.scale = options.style.scale || 2;
    this.padding = options.style.padding;
    this.fontSize = options.style.fontSize;
    this.fontFamily = options.style.fontFamily;
    this.lineHeight = this.fontSize * 1.4;
    this.messageSpacing = 16;
    this.avatarSize = 32;
    this.borderRadius = options.style.borderRadius;

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    
    if (!this.ctx) {
      throw new Error('Could not get canvas 2D context');
    }
  }

  private stripMarkdown(text: string): string {
    // Convert markdown to plain text with basic formatting indicators
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1') // Italic
      .replace(/`(.*?)`/g, '$1') // Inline code
      .replace(/```[\s\S]*?```/g, '[Code Block]') // Code blocks
      .replace(/#{1,6}\s+/g, '') // Headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
      .replace(/^\s*[-*+]\s+/gm, '• ') // Lists
      .replace(/^\s*\d+\.\s+/gm, '') // Numbered lists
      .trim();
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = this.ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  private calculateDimensions(): { width: number; height: number } {
    const contentWidth = 800; // Fixed width for consistency
    const maxContentWidth = contentWidth - (this.padding * 2);
    
    let totalHeight = this.padding; // Top padding

    for (const message of this.options.messages) {
      const agent = this.options.getAgentById(message.agentId);
      if (!agent) continue;

      this.ctx.font = `${this.fontSize}px ${this.fontFamily}`;
      
      const messageContentWidth = maxContentWidth - (this.options.style.showAgentAvatars ? this.avatarSize + 12 : 0);
      const messageHeight = this.calculateMessageHeight(message, messageContentWidth);
      
      totalHeight += messageHeight + this.messageSpacing;
    }

    if (this.options.messages.length > 0) {
      totalHeight -= this.messageSpacing; // remove spacing after last message
    }

    totalHeight += this.padding; // bottom padding

    return {
      width: contentWidth,
      height: Math.max(totalHeight, 1) // Ensure height is at least 1
    };
  }

  private async loadFonts(): Promise<void> {
    try {
      await document.fonts.load(`${this.fontSize}px ${this.fontFamily}`);
    } catch (error) {
      console.warn('Failed to load custom font, using fallback');
    }
  }

  private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number, fillColor: string): void {
    this.ctx.fillStyle = fillColor;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, radius);
    this.ctx.fill();
  }

  private drawAvatar(x: number, y: number, agent: ConversationAgent): void {
    // Draw circular background
    this.ctx.fillStyle = agent.color;
    this.ctx.beginPath();
    this.ctx.arc(x + this.avatarSize / 2, y + this.avatarSize / 2, this.avatarSize / 2, 0, 2 * Math.PI);
    this.ctx.fill();

    // Draw initial
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${this.fontSize}px ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(
      agent.name.charAt(0).toUpperCase(),
      x + this.avatarSize / 2,
      y + this.avatarSize / 2
    );
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
  }

  private getHeaderHeight(): number {
    if (!this.options.style.showAgentAvatars) {
        let height = this.lineHeight;
        if (this.options.style.showTimestamps || this.options.style.showModels) {
            height += this.lineHeight * 0.85;
        }
        return height;
    }
    return this.avatarSize;
  }

  private drawMessage(message: Message, agent: ConversationAgent, x: number, y: number, width: number): number {
    const messageContentWidth = width - (this.padding * 2) - (this.options.style.showAgentAvatars ? this.avatarSize + 12 : 0);
    const contentX = x + this.padding + (this.options.style.showAgentAvatars ? this.avatarSize + 12 : 0);

    const messageHeight = this.calculateMessageHeight(message, messageContentWidth);
    this.drawRoundedRect(x, y, width, messageHeight, this.borderRadius, this.options.style.messageBackgroundColor);

    if (this.options.style.showAgentAvatars) {
        this.drawAvatar(x + this.padding, y + this.padding, agent);
    }

    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = this.options.style.textColor;

    const headerCenterY = y + this.padding + (this.options.style.showAgentAvatars ? this.avatarSize / 2 : this.getHeaderHeight() / 2);
    
    let currentX = contentX;
    
    this.ctx.font = `bold ${this.fontSize}px ${this.fontFamily}`;
    this.ctx.fillText(agent.name, currentX, headerCenterY);
    currentX += this.ctx.measureText(agent.name).width + 8;

    if (this.options.style.showTimestamps) {
        this.ctx.font = `${this.fontSize * 0.8}px ${this.fontFamily}`;
        this.ctx.fillStyle = this.options.style.textColor + '80'; // 50% opacity
        const timestampText = this.options.formatTimestamp(message.timestamp);
        this.ctx.fillText(timestampText, currentX, headerCenterY);
        currentX += this.ctx.measureText(timestampText).width + 8;
    }

    if (this.options.style.showModels) {
        const badgePadding = { x: 6, y: 2 };
        const badgeFontSize = this.fontSize * 0.75;
        this.ctx.font = `${badgeFontSize}px ${this.fontFamily}`;
        
        const modelMetrics = this.ctx.measureText(agent.model);
        const badgeWidth = modelMetrics.width + badgePadding.x * 2;
        const badgeHeight = badgeFontSize * 1.4;

        this.drawRoundedRect(currentX, headerCenterY - badgeHeight / 2, badgeWidth, badgeHeight, 4, this.options.style.backgroundColor);
        
        this.ctx.fillStyle = this.options.style.textColor + '90';
        this.ctx.fillText(agent.model, currentX + badgePadding.x, headerCenterY);
    }

    this.ctx.textBaseline = 'alphabetic';

    const headerHeight = this.getHeaderHeight();
    const contentY = y + this.padding + headerHeight + 8; // 8px spacing

    this.ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    this.ctx.fillStyle = this.options.style.textColor;

    const plainText = this.stripMarkdown(message.content);
    const wrappedLines = this.wrapText(plainText, messageContentWidth);

    for (let i = 0; i < wrappedLines.length; i++) {
        this.ctx.fillText(wrappedLines[i], contentX, contentY + (i * this.lineHeight));
    }

    this.ctx.textBaseline = 'alphabetic';

    return messageHeight + this.messageSpacing;
  }

  private calculateMessageHeight(message: Message, contentWidth: number): number {
    this.ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    
    const plainText = this.stripMarkdown(message.content);
    const wrappedLines = this.wrapText(plainText, contentWidth);
    
    let height = this.padding * 2; // Top and bottom padding
    height += this.getHeaderHeight();
    
    if (message.content && wrappedLines.length > 0) {
        height += 8; // spacing
        height += wrappedLines.length * this.lineHeight;
    }
    
    return Math.max(height, (this.options.style.showAgentAvatars ? this.avatarSize : 0) + this.padding * 2);
  }

  async render(): Promise<HTMLCanvasElement> {
    // Check for cancellation
    if (this.options.abortController?.signal.aborted) {
      throw new Error('Export cancelled');
    }

    // Load fonts
    await this.loadFonts();

    // Calculate dimensions
    const dimensions = this.calculateDimensions();
    
    // Set canvas size
    this.canvas.width = dimensions.width * this.scale;
    this.canvas.height = dimensions.height * this.scale;
    
    // Scale context
    this.ctx.scale(this.scale, this.scale);
    
    // Draw background
    this.ctx.fillStyle = this.options.style.backgroundColor;
    this.ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Draw messages
    let currentY = this.padding;
    const messageWidth = dimensions.width - (this.padding * 2);

    for (let i = 0; i < this.options.messages.length; i++) {
      // Check for cancellation
      if (this.options.abortController?.signal.aborted) {
        throw new Error('Export cancelled');
      }

      const message = this.options.messages[i];
      const agent = this.options.getAgentById(message.agentId);
      if (!agent) continue;

      const messageHeight = this.drawMessage(message, agent, this.padding, currentY, messageWidth);
      currentY += messageHeight;

      // Report progress
      if (this.options.onProgress) {
        const progress = ((i + 1) / this.options.messages.length) * 100;
        this.options.onProgress(progress);
      }
    }

    // Ensure progress reaches 100% even if no messages
    if (this.options.messages.length === 0 && this.options.onProgress) {
      this.options.onProgress(100);
    }

    return this.canvas;
  }
}

export class SVGRenderer {
  private options: CanvasRendererOptions;
  private scale: number;
  private padding: number;
  private fontSize: number;
  private fontFamily: string;
  private lineHeight: number;
  private messageSpacing: number;
  private avatarSize: number;
  private borderRadius: number;

  constructor(options: CanvasRendererOptions) {
    this.options = options;
    this.scale = options.style.scale || 1;
    this.padding = options.style.padding;
    this.fontSize = options.style.fontSize;
    this.fontFamily = options.style.fontFamily;
    this.lineHeight = this.fontSize * 1.4;
    this.messageSpacing = 16;
    this.avatarSize = 32;
    this.borderRadius = options.style.borderRadius;
  }

  private escapeHTML(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  private stripMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/```[\s\S]*?```/g, '[Code Block]')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^\s*[-*+]\s+/gm, '• ')
      .replace(/^\s*\d+\.\s+/gm, '');
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    const paragraphs = text.split('\n');
    for (const paragraph of paragraphs) {
        const words = paragraph.split(' ');
        let currentLine = '';
        for (const word of words) {
            // This is a rough approximation. For accurate wrapping, we'd need a proper text measurement library.
            if ((currentLine + word).length * (this.fontSize * 0.6) > maxWidth) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = currentLine ? `${currentLine} ${word}` : word;
            }
        }
        lines.push(currentLine);
    }
    return lines;
  }
  
  private getHeaderHeight(): number {
    if (!this.options.style.showAgentAvatars) {
        let height = this.lineHeight;
        if (this.options.style.showTimestamps || this.options.style.showModels) {
            height += this.lineHeight * 0.85;
        }
        return height;
    }
    return this.avatarSize;
  }

  private calculateMessageHeight(message: Message, contentWidth: number): number {
    const plainText = this.stripMarkdown(message.content);
    const wrappedLines = this.wrapText(plainText, contentWidth);
    
    let height = this.padding * 2;
    height += this.getHeaderHeight();
    
    if (message.content && wrappedLines.length > 0) {
        height += 8; // spacing
        height += wrappedLines.length * this.lineHeight;
    }
    
    return Math.max(height, (this.options.style.showAgentAvatars ? this.avatarSize : 0) + this.padding * 2);
  }

  public render(): string {
    const width = 800;
    let totalHeight = this.padding;

    const messageWidth = width - (this.padding * 2);
    const messageContentWidth = messageWidth - (this.padding * 2) - (this.options.style.showAgentAvatars ? this.avatarSize + 12 : 0);

    for (const message of this.options.messages) {
      totalHeight += this.calculateMessageHeight(message, messageContentWidth) + this.messageSpacing;
    }
    if (this.options.messages.length > 0) {
      totalHeight -= this.messageSpacing;
    }
    totalHeight += this.padding;

    let svgContent = '';
    let currentY = this.padding;

    for (const message of this.options.messages) {
      const agent = this.options.getAgentById(message.agentId);
      if (!agent) continue;

      const messageHeight = this.calculateMessageHeight(message, messageContentWidth);
      
      svgContent += `<rect x="${this.padding}" y="${currentY}" width="${messageWidth}" height="${messageHeight}" rx="${this.borderRadius}" fill="${this.options.style.messageBackgroundColor}" />`;

      const contentX = this.padding * 2 + (this.options.style.showAgentAvatars ? this.avatarSize + 12 : 0);
      
      if (this.options.style.showAgentAvatars) {
        svgContent += `
          <g transform="translate(${this.padding * 2}, ${currentY + this.padding})">
            <circle cx="${this.avatarSize/2}" cy="${this.avatarSize/2}" r="${this.avatarSize/2}" fill="${agent.color}" />
            <text x="${this.avatarSize/2}" y="${this.avatarSize/2}" dy="0.35em" text-anchor="middle" fill="#ffffff" font-size="${this.fontSize}" font-weight="bold">${this.escapeHTML(agent.name.charAt(0).toUpperCase())}</text>
          </g>
        `;
      }
      
      const headerCenterY = currentY + this.padding + (this.options.style.showAgentAvatars ? this.avatarSize / 2 : this.getHeaderHeight() / 2);
      let currentX = contentX;

      svgContent += `<text x="${currentX}" y="${headerCenterY}" dominant-baseline="middle" font-weight="bold" font-size="${this.fontSize}" fill="${this.options.style.textColor}">${this.escapeHTML(agent.name)}</text>`;
      currentX += (agent.name.length * this.fontSize * 0.7) + 8;
      
      if (this.options.style.showTimestamps) {
        const timestampText = this.options.formatTimestamp(message.timestamp);
        svgContent += `<text x="${currentX}" y="${headerCenterY}" dominant-baseline="middle" font-size="${this.fontSize * 0.8}" fill="${this.options.style.textColor}" opacity="0.8">${this.escapeHTML(timestampText)}</text>`;
        currentX += (timestampText.length * this.fontSize * 0.45) + 8;
      }
      
      if (this.options.style.showModels) {
        const badgePadding = { x: 6, y: 2 };
        const badgeFontSize = this.fontSize * 0.75;
        const modelWidth = agent.model.length * badgeFontSize * 0.6;
        const badgeWidth = modelWidth + badgePadding.x * 2;
        const badgeHeight = badgeFontSize * 1.4;

        svgContent += `<rect x="${currentX}" y="${headerCenterY - badgeHeight / 2}" width="${badgeWidth}" height="${badgeHeight}" rx="4" fill="${this.options.style.backgroundColor}" />`;
        svgContent += `<text x="${currentX + badgePadding.x}" y="${headerCenterY}" dominant-baseline="middle" font-size="${badgeFontSize}" fill="${this.options.style.textColor}" opacity="0.9">${this.escapeHTML(agent.model)}</text>`;
      }
      
      const headerHeight = this.getHeaderHeight();
      const contentY = currentY + this.padding + headerHeight + 8;
      
      const plainText = this.stripMarkdown(message.content);
      const wrappedLines = this.wrapText(plainText, messageContentWidth);

      for (let i = 0; i < wrappedLines.length; i++) {
        svgContent += `<text x="${contentX}" y="${contentY + (i * this.lineHeight)}" font-size="${this.fontSize}" fill="${this.options.style.textColor}">${this.escapeHTML(wrappedLines[i])}</text>`;
      }
      
      currentY += messageHeight + this.messageSpacing;
    }

    return `
      <svg width="${width}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${this.fontFamily}">
        <style>
          text { white-space: pre; }
        </style>
        <rect width="100%" height="100%" fill="${this.options.style.backgroundColor}" />
        ${svgContent}
      </svg>
    `;
  }
}

export class ExportService {
  static async exportAsPNG(
    messages: Message[],
    agents: ConversationAgent[],
    style: ExportStyle,
    filename: string = 'conversation',
    getAgentById: (agentId: string) => ConversationAgent | undefined,
    formatTimestamp: (timestamp: string) => string,
    onProgress?: ProgressCallback,
    abortController?: AbortController
  ): Promise<void> {
    try {
      const renderer = new CanvasRenderer({
        messages,
        agents,
        style,
        getAgentById,
        formatTimestamp,
        onProgress,
        abortController
      });

      const canvas = await renderer.render();
      
      // Create download link
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error: any) {
      if (error.message === 'Export cancelled') {
        throw error; // Re-throw cancellation errors
      }
      console.error('Error exporting as PNG:', error);
      throw new Error(`Failed to export as PNG: ${error.message}`);
    }
  }

  static async exportAsSVG(
    messages: Message[],
    agents: ConversationAgent[],
    style: ExportStyle,
    filename: string = 'conversation',
    getAgentById: (agentId: string) => ConversationAgent | undefined,
    formatTimestamp: (timestamp: string) => string,
    onProgress?: ProgressCallback,
    abortController?: AbortController
  ): Promise<void> {
    try {
      // For now, use CanvasRenderer to create PNG, then wrap in SVG
      // This maintains the existing behavior while removing html2canvas dependency
      const renderer = new SVGRenderer({
        messages,
        agents,
        style,
        getAgentById,
        formatTimestamp,
        onProgress,
        abortController
      });

      const svgString = renderer.render();
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = `${filename}.svg`;
      link.href = url;
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (error: any) {
      if (error.message === 'Export cancelled') {
        throw error; // Re-throw cancellation errors
      }
      console.error('Error exporting as SVG:', error);
      throw new Error(`Failed to export as SVG: ${error.message}`);
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