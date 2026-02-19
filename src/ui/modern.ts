import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';

const theme = {
  primary: '#06B6D4',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  muted: '#6B7280',
};

const titleGradient = gradient(['#06B6D4', '#8B5CF6', '#EC4899']);
const successGradient = gradient(['#10B981', '#059669']);

export const modernUI = {
  banner(): void {
    const ascii = [
      '   ██████╗ ██████╗ ██████╗ ███████╗███╗   ██╗ ██████╗ ██╗  ██╗██╗   ██╗',
      '  ██╔═══██╗██╔══██╗██╔══██╗██╔════╝████╗  ██║██╔═══██╗██║ ██╔╝██║   ██║',
      '  ██║   ██║██████╔╝██████╔╝█████╗  ██╔██╗ ██║██║   ██║█████╔╝ ██║   ██║',
      '  ██║   ██║██╔═══╝ ██╔═══╝ ██╔══╝  ██║╚██╗██║██║   ██║██╔═██╗ ██║   ██║',
      '  ╚██████╔╝██║     ██║     ███████╗██║ ╚████║╚██████╔╝██║  ██╗╚██████╔╝',
      '   ╚═════╝ ╚═╝     ╚═╝     ╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝',
    ];
    
    console.log(titleGradient(ascii.join('\n')));
    console.log(chalk.gray('   OCODER - AI-powered coding assistant'));
    console.log();
  },

  welcomeBox(model: string, sessionId: string): void {
    const content = [
      chalk.bold.white('  Session Started'),
      '',
      `  ${chalk.gray('Model')}   ${chalk.cyan(model)}`,
      `  ${chalk.gray('ID')}      ${chalk.gray(sessionId.slice(0, 16))}...`,
      '',
      chalk.gray(`  Type ${chalk.cyan('/help')} for commands`),
    ].join('\n');

    console.log('\n' + boxen(content, {
      padding: 0,
      margin: 0,
      borderStyle: 'round',
      borderColor: 'cyan',
      dimBorder: true,
    }) + '\n');
  },

  prompt(): void {
    process.stdout.write(chalk.cyan('❯ '));
  },

  divider(title?: string): void {
    if (title) {
      console.log(chalk.gray(`─── ${title} ${'─'.repeat(Math.max(0, 40 - title.length))}`));
    } else {
      console.log(chalk.gray('─'.repeat(50)));
    }
  },

  section(title: string, content: string[]): void {
    console.log();
    console.log(chalk.bold.cyan(`  ${title}`));
    console.log(chalk.gray('  ' + '─'.repeat(30)));
    content.forEach(line => {
      console.log(`  ${line}`);
    });
    console.log();
  },

  keyValue(pairs: [string, string | number][]): void {
    const maxKeyLen = Math.max(...pairs.map(([k]) => k.length));
    pairs.forEach(([key, value]) => {
      const paddedKey = key.padEnd(maxKeyLen);
      console.log(`  ${chalk.gray(paddedKey)}  ${chalk.white(String(value))}`);
    });
  },

  statusBox(title: string, items: [string, string][]): void {
    const lines = items.map(([k, v]) => `  ${chalk.gray(k.padEnd(12))} ${chalk.white(v)}`);
    const content = [chalk.bold.cyan(`  ${title}`), '', ...lines].join('\n');
    console.log('\n' + boxen(content, {
      padding: { left: 1, right: 2, top: 0, bottom: 0 },
      borderStyle: 'round',
      borderColor: 'cyan',
      dimBorder: true,
    }));
  },

  tokenStats(stats: {
    totalCalls: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    averagePerCall: number;
  }): void {
    const barWidth = 20;
    const total = stats.totalTokens || 1;
    const promptPct = (stats.promptTokens / total) * 100;
    const compPct = (stats.completionTokens / total) * 100;
    const promptBar = Math.round((promptPct / 100) * barWidth);
    const compBar = barWidth - promptBar;

    const content = [
      chalk.bold.cyan('  Token Usage'),
      '',
      `  ${chalk.gray('Calls')}        ${chalk.white(stats.totalCalls)}`,
      `  ${chalk.gray('Total')}        ${chalk.yellow(stats.totalTokens.toLocaleString())}`,
      `  ${chalk.gray('Prompt')}       ${chalk.blue(stats.promptTokens.toLocaleString())}`,
      `  ${chalk.gray('Completion')}   ${chalk.green(stats.completionTokens.toLocaleString())}`,
      `  ${chalk.gray('Avg/Call')}     ${chalk.magenta(stats.averagePerCall.toLocaleString())}`,
      '',
      `  ${chalk.gray('Distribution')}`,
      `  ${chalk.blue('█'.repeat(promptBar))}${chalk.gray('░'.repeat(compBar))} ${chalk.blue(`${promptPct.toFixed(0)}%`)}`,
      `  ${chalk.green('█'.repeat(compBar))}${chalk.gray('░'.repeat(promptBar))} ${chalk.green(`${compPct.toFixed(0)}%`)}`,
    ].join('\n');

    console.log('\n' + boxen(content, {
      padding: { left: 1, right: 2, top: 0, bottom: 0 },
      borderStyle: 'round',
      borderColor: 'yellow',
      dimBorder: true,
    }));
  },

  toolStart(name: string): void {
    console.log(chalk.gray(`  ⚡ ${name}...`));
  },

  toolSuccess(name: string): void {
    console.log(chalk.green(`  ✓ ${name}`));
  },

  toolError(name: string, error: string): void {
    console.log(chalk.red(`  ✗ ${name}: ${error}`));
  },

  aiMessage(content: string): void {
    console.log();
    console.log(chalk.cyan('┌─ AI'));
    content.split('\n').forEach(line => {
      console.log(chalk.cyan('│') + ' ' + line);
    });
    console.log(chalk.cyan('└'));
    console.log();
  },

  userMessage(content: string): void {
    console.log(chalk.magenta('❯') + ' ' + chalk.white(content));
  },

  error(message: string): void {
    console.log('\n' + boxen(chalk.red(`  ✗ ${message}  `), {
      padding: 0,
      borderStyle: 'round',
      borderColor: 'red',
    }) + '\n');
  },

  success(message: string): void {
    console.log('\n' + boxen(chalk.green(`  ✓ ${message}  `), {
      padding: 0,
      borderStyle: 'round',
      borderColor: 'green',
    }) + '\n');
  },

  info(message: string): void {
    console.log(chalk.blue('ℹ') + ' ' + message);
  },

  warn(message: string): void {
    console.log(chalk.yellow('⚠') + ' ' + message);
  },

  help(): void {
    const commands = [
      ['/help', 'Show this help message'],
      ['/status', 'Show session and token stats'],
      ['/clear', 'Clear conversation history'],
      ['/compact', 'Compact context window'],
      ['/sessions', 'List saved sessions'],
      ['/exit', 'Exit the CLI'],
    ];

    console.log();
    console.log(chalk.bold.cyan('  Commands'));
    console.log(chalk.gray('  ' + '─'.repeat(30)));
    commands.forEach(([cmd, desc]) => {
      console.log(`  ${chalk.cyan(cmd.padEnd(12))} ${chalk.gray(desc)}`);
    });
    console.log();
  },

  spinner: {
    frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    start(msg: string): { stop: () => void; succeed: (m?: string) => void; fail: (m?: string) => void } {
      let i = 0;
      const timer = setInterval(() => {
        process.stdout.write(`\r${chalk.cyan(this.frames[i])} ${msg}`);
        i = (i + 1) % this.frames.length;
      }, 80);
      return {
        stop: () => {
          clearInterval(timer);
          process.stdout.write('\r' + ' '.repeat(msg.length + 3) + '\r');
        },
        succeed: (m?: string) => {
          clearInterval(timer);
          process.stdout.write(`\r${chalk.green('✓')} ${m || msg}\n`);
        },
        fail: (m?: string) => {
          clearInterval(timer);
          process.stdout.write(`\r${chalk.red('✗')} ${m || msg}\n`);
        },
      };
    },
  },
};

export default modernUI;
