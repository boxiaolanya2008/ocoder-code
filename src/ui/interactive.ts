import chalk from 'chalk';
import { text, select, confirm, multiselect } from '@clack/prompts';

export interface ErrorSuggestion {
  error: string;
  suggestion: string;
  autoFix?: () => Promise<boolean>;
}

export const errorSuggestions: ErrorSuggestion[] = [
  {
    error: 'API key not configured',
    suggestion: 'Run `ocoder-code config set apiKey <your-key>` to configure API key',
    autoFix: async () => {
      const key = await text({
        message: 'Enter your API key:',
        placeholder: 'sk-...',
      });
      if (key) {
        // Save key logic here
        return true;
      }
      return false;
    }
  },
  {
    error: 'No OCODER.md found',
    suggestion: 'Run `ocoder-code init` to initialize your project',
  },
  {
    error: 'Model not available',
    suggestion: 'Check your API key permissions or try a different model with --model',
  },
  {
    error: 'Network error',
    suggestion: 'Check your internet connection and try again',
  },
];

export async function handleError(error: Error): Promise<void> {
  console.log(chalk.red.bold('\n✗ Error occurred'));
  console.log(chalk.red(error.message));

  const suggestion = errorSuggestions.find(s => 
    error.message.toLowerCase().includes(s.error.toLowerCase())
  );

  if (suggestion) {
    console.log(chalk.yellow('\n💡 Suggestion:'));
    console.log(chalk.yellow(`   ${suggestion.suggestion}`));

    if (suggestion.autoFix) {
      const shouldFix = await confirm({
        message: 'Would you like to auto-fix this?',
      });

      if (shouldFix) {
        const fixed = await suggestion.autoFix();
        if (fixed) {
          console.log(chalk.green('\n✓ Issue resolved! Please try again.\n'));
        }
      }
    }
  }
}

export function showCommandHelp(): void {
  console.log(chalk.cyan.bold('\n📚 Available Commands:\n'));

  const commands = [
    { cmd: 'init', desc: 'Initialize project with OCODER.md', example: 'ocoder-code init' },
    { cmd: 'chat', desc: 'Start chat session', example: 'ocoder-code chat -m "Hello"' },
    { cmd: 'status', desc: 'Show configuration and stats', example: 'ocoder-code status' },
    { cmd: 'config', desc: 'Manage configuration', example: 'ocoder-code config show' },
    { cmd: 'session', desc: 'Manage sessions', example: 'ocoder-code session list' },
  ];

  commands.forEach(({ cmd, desc, example }) => {
    console.log(`  ${chalk.green(cmd.padEnd(10))} ${chalk.gray(desc)}`);
    console.log(`           ${chalk.dim('→')} ${chalk.cyan(example)}\n`);
  });

  console.log(chalk.gray('Use -h or --help with any command for more details\n'));
}

export async function showInteractiveMenu(): Promise<string> {
  const action = await select({
    message: 'What would you like to do?',
    options: [
      { value: 'chat', label: '💬 Start Chat', hint: 'Begin interactive session' },
      { value: 'init', label: '🚀 Initialize Project', hint: 'Create OCODER.md' },
      { value: 'status', label: '📊 View Status', hint: 'Show config and stats' },
      { value: 'config', label: '⚙️  Configure', hint: 'Settings management' },
      { value: 'help', label: '❓ Help', hint: 'Show documentation' },
      { value: 'exit', label: '👋 Exit', hint: 'Quit application' },
    ],
  });

  return action as string;
}

export function showProgressBar(current: number, total: number, label: string = 'Progress'): void {
  const width = 30;
  const filled = Math.round((current / total) * width);
  const empty = width - filled;

  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  const percent = Math.round((current / total) * 100);

  process.stdout.write(`\r${chalk.cyan(label)} ${bar} ${chalk.bold(`${percent}%`)} (${current}/${total})`);

  if (current === total) {
    process.stdout.write('\n');
  }
}

export function showSpinner(message: string): { stop: () => void; succeed: (text?: string) => void; fail: (text?: string) => void } {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  let active = true;

  const timer = setInterval(() => {
    if (!active) return;
    process.stdout.write(`\r${chalk.cyan(frames[i])} ${message}`);
    i = (i + 1) % frames.length;
  }, 80);

  return {
    stop: () => {
      active = false;
      clearInterval(timer);
      process.stdout.write('\r' + ' '.repeat(message.length + 2) + '\r');
    },
    succeed: (text?: string) => {
      active = false;
      clearInterval(timer);
      process.stdout.write(`\r${chalk.green('✓')} ${text || message}\n`);
    },
    fail: (text?: string) => {
      active = false;
      clearInterval(timer);
      process.stdout.write(`\r${chalk.red('✗')} ${text || message}\n`);
    },
  };
}

export async function confirmAction(message: string, danger: boolean = false): Promise<boolean> {
  const color = danger ? chalk.red : chalk.yellow;
  const icon = danger ? '⚠️' : '❓';

  console.log(color(`${icon} ${message}`));

  return await confirm({
    message: 'Continue?',
  }) as boolean;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
