import { UIComponent } from '../engine';
import chalk from 'chalk';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    toolCalls?: any[];
    tokens?: number;
  };
}

export class ChatModule {
  private messages: ChatMessage[] = [];
  private listeners: ((message: ChatMessage) => void)[] = [];

  addMessage(role: 'user' | 'assistant' | 'system', content: string, metadata?: any): string {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message: ChatMessage = {
      id,
      role,
      content,
      timestamp: new Date(),
      metadata
    };
    
    this.messages.push(message);
    this.listeners.forEach(listener => listener(message));
    return id;
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  getLastMessage(): ChatMessage | undefined {
    return this.messages[this.messages.length - 1];
  }

  clear(): void {
    this.messages = [];
  }

  onMessage(listener: (message: ChatMessage) => void): void {
    this.listeners.push(listener);
  }

  exportToContext(): Array<{ role: string; content: string }> {
    return this.messages.map(m => ({
      role: m.role,
      content: m.content
    }));
  }
}

export class ChatUI extends UIComponent {
  private chatModule: ChatModule;

  constructor(chatModule: ChatModule) {
    super();
    this.chatModule = chatModule;
  }

  render(): string {
    const messages = this.chatModule.getMessages();
    
    if (messages.length === 0) {
      return this.engine.renderBox('Start a conversation...', {
        title: 'Chat',
        width: 80,
        color: 'gray'
      });
    }

    const recentMessages = messages.slice(-10);
    let content = '';

    recentMessages.forEach(msg => {
      const time = chalk.gray(`[${msg.timestamp.toLocaleTimeString()}]`);
      const role = msg.role === 'user' 
        ? chalk.cyan('You') 
        : msg.role === 'assistant' 
          ? chalk.green('AI') 
          : chalk.gray('System');
      
      content += `${time} ${role}:\n`;
      
      // Format content
      const lines = msg.content.split('\n');
      lines.forEach(line => {
        content += `  ${line}\n`;
      });
      
      // Show tool calls if any
      if (msg.metadata?.toolCalls && msg.metadata.toolCalls.length > 0) {
        content += chalk.yellow(`  [Tool calls: ${msg.metadata.toolCalls.length}]\n`);
      }
      
      content += '\n';
    });

    if (messages.length > 10) {
      content += chalk.gray(`... (${messages.length - 10} more messages above) ...\n`);
    }

    return this.engine.renderBox(content, {
      title: `Chat (${messages.length} messages)`,
      width: 80,
      height: 20,
      color: 'cyan'
    });
  }

  renderMessage(message: ChatMessage): string {
    const role = message.role === 'user' 
      ? chalk.cyan.bold('You: ') 
      : message.role === 'assistant' 
        ? chalk.green.bold('AI: ') 
        : chalk.gray.bold('System: ');
    
    return `${role}${message.content}`;
  }

  renderInputPrompt(): string {
    return chalk.cyan('❯ ');
  }

  renderStreamingContent(content: string): void {
    process.stdout.write(content);
  }

  update(data: any): void {
    // Trigger re-render
  }
}
