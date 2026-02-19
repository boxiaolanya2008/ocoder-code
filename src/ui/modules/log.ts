import { UIComponent } from '../engine';
import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  source?: string;
  metadata?: any;
}

export class LogModule {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private listeners: ((entry: LogEntry) => void)[] = [];

  log(level: LogLevel, message: string, source?: string, metadata?: any): string {
    const id = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const entry: LogEntry = {
      id,
      timestamp: new Date(),
      level,
      message,
      source,
      metadata
    };

    this.logs.push(entry);

    // Keep only last maxLogs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    this.listeners.forEach(listener => listener(entry));
    return id;
  }

  debug(message: string, source?: string, metadata?: any): string {
    return this.log('debug', message, source, metadata);
  }

  info(message: string, source?: string, metadata?: any): string {
    return this.log('info', message, source, metadata);
  }

  warn(message: string, source?: string, metadata?: any): string {
    return this.log('warn', message, source, metadata);
  }

  error(message: string, source?: string, metadata?: any): string {
    return this.log('error', message, source, metadata);
  }

  success(message: string, source?: string, metadata?: any): string {
    return this.log('success', message, source, metadata);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(l => l.level === level);
    }
    return [...this.logs];
  }

  getRecentLogs(count: number = 20): LogEntry[] {
    return this.logs.slice(-count);
  }

  clear(): void {
    this.logs = [];
  }

  onLog(listener: (entry: LogEntry) => void): void {
    this.listeners.push(listener);
  }

  exportToFile(): string {
    return this.logs.map(l => 
      `[${l.timestamp.toISOString()}] [${l.level.toUpperCase()}] ${l.source ? `[${l.source}] ` : ''}${l.message}`
    ).join('\n');
  }
}

export class LogUI extends UIComponent {
  private logModule: LogModule;

  constructor(logModule: LogModule) {
    super();
    this.logModule = logModule;
  }

  render(): string {
    return this.renderRecentLogs();
  }

  renderRecentLogs(count: number = 15): string {
    const logs = this.logModule.getRecentLogs(count);

    if (logs.length === 0) {
      return this.engine.renderBox('No logs', {
        title: 'Log',
        width: 80,
        color: 'gray'
      });
    }

    let content = '';

    logs.forEach(log => {
      const time = chalk.gray(`[${log.timestamp.toLocaleTimeString()}]`);
      const levelIcon = this.getLevelIcon(log.level);
      const levelColor = this.getLevelColor(log.level);
      const source = log.source ? chalk.gray(`[${log.source}]`) : '';
      
      content += `${time} ${levelIcon} ${source} ${log.message}\n`;
    });

    return this.engine.renderBox(content, {
      title: `Recent Logs (${logs.length})`,
      width: 80,
      height: 18,
      color: 'gray'
    });
  }

  renderLogLevel(level: LogLevel): string {
    const logs = this.logModule.getLogs(level);
    const levelName = level.toUpperCase();

    if (logs.length === 0) {
      return this.engine.renderBox(`No ${level} logs`, {
        title: `${levelName} Logs`,
        width: 70,
        color: 'gray'
      });
    }

    const recent = logs.slice(-10);
    let content = '';

    recent.forEach(log => {
      const time = chalk.gray(`[${log.timestamp.toLocaleTimeString()}]`);
      content += `${time} ${log.message}\n`;
    });

    if (logs.length > 10) {
      content += chalk.gray(`\n... (${logs.length - 10} more) ...\n`);
    }

    const color = this.getLevelColor(level);
    
    return this.engine.renderBox(content, {
      title: `${levelName} Logs (${logs.length})`,
      width: 70,
      color: level === 'error' ? 'red' : level === 'success' ? 'green' : 'gray'
    });
  }

  renderLiveLog(entry: LogEntry): void {
    const time = chalk.gray(`[${entry.timestamp.toLocaleTimeString()}]`);
    const levelIcon = this.getLevelIcon(entry.level);
    const source = entry.source ? chalk.gray(`[${entry.source}]`) : '';
    
    console.log(`${time} ${levelIcon} ${source} ${entry.message}`);
  }

  update(data: any): void {
    // Trigger re-render
  }

  private getLevelIcon(level: LogLevel): string {
    const icons: Record<LogLevel, string> = {
      debug: '◆',
      info: 'ℹ',
      warn: '⚠',
      error: '✗',
      success: '✓'
    };
    return icons[level];
  }

  private getLevelColor(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      debug: 'gray',
      info: 'blue',
      warn: 'yellow',
      error: 'red',
      success: 'green'
    };
    return colors[level];
  }
}
