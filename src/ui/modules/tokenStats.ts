import { UIComponent } from '../engine';
import chalk from 'chalk';

export interface TokenUsage {
  id: string;
  timestamp: Date;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  operation: string;
}

export interface UsageStats {
  totalCalls: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  averagePerCall: number;
  maxSingleCall: number;
  history: TokenUsage[];
}

export class TokenStatsModule {
  private history: TokenUsage[] = [];
  private maxHistorySize: number = 100;

  recordUsage(
    promptTokens: number,
    completionTokens: number,
    model: string,
    operation: string = 'chat'
  ): string {
    const id = `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const usage: TokenUsage = {
      id,
      timestamp: new Date(),
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      model,
      operation
    };

    this.history.push(usage);
    
    // Keep only last maxHistorySize records
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }

    return id;
  }

  getStats(): UsageStats {
    if (this.history.length === 0) {
      return {
        totalCalls: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
        averagePerCall: 0,
        maxSingleCall: 0,
        history: []
      };
    }

    const totals = this.history.reduce(
      (acc, curr) => ({
        prompt: acc.prompt + curr.promptTokens,
        completion: acc.completion + curr.completionTokens,
        total: acc.total + curr.totalTokens,
        max: Math.max(acc.max, curr.totalTokens)
      }),
      { prompt: 0, completion: 0, total: 0, max: 0 }
    );

    return {
      totalCalls: this.history.length,
      totalPromptTokens: totals.prompt,
      totalCompletionTokens: totals.completion,
      totalTokens: totals.total,
      averagePerCall: Math.round(totals.total / this.history.length),
      maxSingleCall: totals.max,
      history: [...this.history]
    };
  }

  getRecentHistory(count: number = 20): TokenUsage[] {
    return this.history.slice(-count);
  }

  getHourlyStats(): { hour: string; tokens: number; calls: number }[] {
    const hourly = new Map<string, { tokens: number; calls: number }>();
    
    this.history.forEach(usage => {
      const hour = usage.timestamp.toISOString().slice(0, 13) + ':00';
      const existing = hourly.get(hour) || { tokens: 0, calls: 0 };
      existing.tokens += usage.totalTokens;
      existing.calls += 1;
      hourly.set(hour, existing);
    });

    return Array.from(hourly.entries())
      .map(([hour, data]) => ({ hour, ...data }))
      .sort((a, b) => a.hour.localeCompare(b.hour))
      .slice(-24); // Last 24 hours
  }

  clear(): void {
    this.history = [];
  }
}

export class TokenStatsUI extends UIComponent {
  private tokenModule: TokenStatsModule;

  constructor(tokenModule: TokenStatsModule) {
    super();
    this.tokenModule = tokenModule;
  }

  render(): string {
    return this.renderStats();
  }

  renderStats(): string {
    const stats = this.tokenModule.getStats();

    if (stats.totalCalls === 0) {
      return this.engine.renderBox('No token usage data yet', {
        title: 'Token Statistics',
        width: 70,
        color: 'gray'
      });
    }

    let content = '';
    
    // Summary stats with colors
    content += chalk.cyan('📊 Usage Summary\n\n');
    content += `  Total Calls:      ${chalk.white(stats.totalCalls.toString())}\n`;
    content += `  Total Tokens:     ${chalk.yellow(stats.totalTokens.toLocaleString())}\n`;
    content += `  Prompt Tokens:    ${chalk.blue(stats.totalPromptTokens.toLocaleString())}\n`;
    content += `  Completion:       ${chalk.green(stats.totalCompletionTokens.toLocaleString())}\n`;
    content += `  Average/Call:     ${chalk.magenta(stats.averagePerCall.toLocaleString())}\n`;
    content += `  Max Single Call:  ${chalk.red(stats.maxSingleCall.toLocaleString())}\n`;

    // Token distribution bar chart
    content += chalk.cyan('\n📈 Token Distribution\n\n');
    content += this.renderTokenDistribution(stats);

    // Hourly trend
    const hourly = this.tokenModule.getHourlyStats();
    if (hourly.length > 1) {
      content += chalk.cyan('\n📉 Hourly Trend (Last 24h)\n\n');
      content += this.renderHourlyTrend(hourly);
    }

    // Recent usage mini chart
    const recent = this.tokenModule.getRecentHistory(10);
    if (recent.length > 0) {
      content += chalk.cyan('\n🕐 Recent Usage (Last 10 calls)\n\n');
      content += this.renderRecentUsage(recent);
    }

    return this.engine.renderBox(content, {
      title: `Token Statistics - ${stats.totalTokens.toLocaleString()} tokens used`,
      width: 80,
      color: 'cyan'
    });
  }

  private renderTokenDistribution(stats: UsageStats): string {
    const total = stats.totalTokens;
    if (total === 0) return '';

    const promptPct = (stats.totalPromptTokens / total) * 100;
    const completionPct = (stats.totalCompletionTokens / total) * 100;

    const barWidth = 30;
    const promptBar = Math.round((promptPct / 100) * barWidth);
    const completionBar = barWidth - promptBar;

    let result = '';
    result += '  Prompt:     ';
    result += chalk.blue('█'.repeat(promptBar));
    result += chalk.gray('░'.repeat(completionBar));
    result += ` ${promptPct.toFixed(1)}%\n`;

    result += '  Completion: ';
    result += chalk.green('█'.repeat(completionBar));
    result += chalk.gray('░'.repeat(promptBar));
    result += ` ${completionPct.toFixed(1)}%\n`;

    return result;
  }

  private renderHourlyTrend(hourly: { hour: string; tokens: number; calls: number }[]): string {
    if (hourly.length === 0) return '';

    const maxTokens = Math.max(...hourly.map(h => h.tokens));
    const chartHeight = 8;
    const barWidth = 3;

    let result = '';

    // Find peak for scaling
    const maxValue = maxTokens || 1;

    // Draw chart
    for (let i = chartHeight; i >= 0; i--) {
      const threshold = (i / chartHeight) * maxValue;
      result += chalk.gray(`${Math.round(threshold).toString().padStart(6)} │`);

      hourly.slice(-12).forEach(h => {
        const barHeight = (h.tokens / maxValue) * chartHeight;
        if (barHeight >= i) {
          result += chalk.cyan('█'.repeat(barWidth));
        } else {
          result += ' '.repeat(barWidth);
        }
        result += ' ';
      });
      result += '\n';
    }

    // X-axis labels
    result += chalk.gray('       └' + '─'.repeat(hourly.slice(-12).length * (barWidth + 1)) + '\n');
    result += '        ';
    hourly.slice(-12).forEach(h => {
      const time = h.hour.slice(11, 13);
      result += chalk.gray(time.padStart(barWidth)) + ' ';
    });
    result += '\n';

    return result;
  }

  private renderRecentUsage(recent: TokenUsage[]): string {
    const maxTokens = Math.max(...recent.map(u => u.totalTokens));
    const barWidth = 30;

    let result = '';

    recent.forEach((usage, index) => {
      const barLength = maxTokens > 0 
        ? Math.round((usage.totalTokens / maxTokens) * barWidth) 
        : 0;
      
      const time = usage.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const bar = chalk.cyan('█'.repeat(barLength)) + chalk.gray('░'.repeat(barWidth - barLength));
      
      result += `  ${chalk.gray(time)} ${bar} ${chalk.white(usage.totalTokens.toString())}\n`;
    });

    return result;
  }

  renderCompactStats(): string {
    const stats = this.tokenModule.getStats();
    
    if (stats.totalCalls === 0) {
      return chalk.gray('No usage data');
    }

    return chalk.cyan(`📊 ${stats.totalCalls} calls │ ${stats.totalTokens.toLocaleString()} tokens │ ~${stats.averagePerCall}/call`);
  }

  update(data: any): void {
    // Trigger re-render
  }
}
