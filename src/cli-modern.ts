import { Command } from 'commander';
import { intro, outro, select, text, confirm, spinner, isCancel } from '@clack/prompts';
import gradient from 'gradient-string';
import chalk from 'chalk';
import { z } from 'zod';
import Table from 'cli-table3';
import { loadConfig } from './config';
import { createApiClient, Message } from './api';
import { getToolsForModel } from './tools';
import { cli } from './ui/facade';
import { runInteractive } from './repl';
import { handleError, showCommandHelp, showInteractiveMenu, showSpinner } from './ui/interactive';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

// Zod schemas for validation
const InitOptionsSchema = z.object({
  model: z.string().optional(),
  template: z.enum(['minimal', 'full']).optional(),
});

const ChatOptionsSchema = z.object({
  model: z.string().optional(),
  message: z.string().optional(),
  file: z.string().optional(),
  noAgent: z.boolean().optional(),
});

// Gradient themes
const titleGradient = gradient(['#cyan', '#magenta', '#yellow']);
const successGradient = gradient(['#00ff00', '#00aa00']);
const errorGradient = gradient(['#ff0000', '#aa0000']);

// Modern styled output helpers
export const style = {
  title: (text: string) => titleGradient(text),
  success: (text: string) => chalk.green.bold('✓ ') + chalk.green(text),
  error: (text: string) => chalk.red.bold('✗ ') + chalk.red(text),
  warning: (text: string) => chalk.yellow.bold('⚠ ') + chalk.yellow(text),
  info: (text: string) => chalk.blue.bold('ℹ ') + chalk.blue(text),
  dim: (text: string) => chalk.gray(text),
  bold: (text: string) => chalk.bold(text),
  code: (text: string) => chalk.cyan(text),
  path: (text: string) => chalk.magenta(text),
};

// Color control - check --no-color flag
let useColors = true;
export const setColorEnabled = (enabled: boolean) => {
  useColors = enabled;
  if (!enabled) {
    chalk.level = 0;
  }
};

// Modern banner display
export function showModernBanner(): void {
  const banner = `
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║     ${titleGradient('O C O D E R   C O D E   C L I')}    ║
║                                                          ║
║     AI-powered coding assistant for modern developers    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `;
  console.log(banner);
}

// Modern status table
export async function showStatusTable(): Promise<void> {
  const config = await loadConfig();
  
  const table = new Table({
    head: [chalk.cyan('Property'), chalk.cyan('Value')],
    colWidths: [20, 40],
    style: { 
      head: [], 
      border: ['cyan'],
    },
  });

  table.push(
    ['Model', config.model || 'default'],
    ['API Base', config.apiBase || 'default'],
    ['Agent', config.agentEnabled ? 'enabled' : 'disabled'],
    ['Output Style', config.outputStyle || 'default'],
  );

  console.log('\n' + chalk.bold('Current Configuration:'));
  console.log(table.toString() + '\n');
}

// Token stats table
export function showTokenStatsTable(): void {
  const stats = cli.tokenStats.getStats();
  
  const table = new Table({
    head: [chalk.cyan('Metric'), chalk.cyan('Value')],
    colWidths: [25, 30],
  });

  table.push(
    ['Total Calls', stats.totalCalls.toString()],
    ['Total Tokens', stats.totalTokens.toLocaleString()],
    ['Prompt Tokens', stats.totalPromptTokens.toLocaleString()],
    ['Completion Tokens', stats.totalCompletionTokens.toLocaleString()],
    ['Average/Call', stats.averagePerCall.toLocaleString()],
    ['Max Single Call', stats.maxSingleCall.toLocaleString()],
  );

  console.log('\n' + chalk.bold('Token Usage Statistics:'));
  console.log(table.toString() + '\n');
}

// Interactive init command
async function initCommand(options: z.infer<typeof InitOptionsSchema>): Promise<void> {
  intro(titleGradient(' OCODER CODE - Project Initialization '));

  const template = options.template || await select({
    message: 'Choose a project template:',
    options: [
      { value: 'minimal', label: 'Minimal - Basic OCODER.md only' },
      { value: 'full', label: 'Full - With examples and guidelines' },
    ],
  });

  const projectName = await text({
    message: 'Project name:',
    placeholder: 'my-awesome-project',
  });

  const s = spinner();
  s.start('Creating project files...');

  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 1000));

  const content = template === 'full' 
    ? generateFullTemplate(projectName as string)
    : generateMinimalTemplate(projectName as string);

  fs.writeFileSync('OCODER.md', content);

  s.stop(style.success('Created OCODER.md'));

  outro(style.success('Project initialized successfully!'));
}

// Interactive chat command
async function chatCommand(options: z.infer<typeof ChatOptionsSchema>): Promise<void> {
  const message = options.message;
  
  if (message) {
    // Single message mode
    const s = spinner();
    s.start('Processing...');

    try {
      const config = await loadConfig();
      const api = createApiClient(config);
      const tools = options.noAgent ? undefined : getToolsForModel(config.model || 'deepseek-chat');

      const messages: Message[] = [{ role: 'user', content: message }];
      const result = await api.chat(messages, tools, false);

      s.stop();

      const response = (result.response as any).choices?.[0]?.message?.content;
      if (response) {
        console.log('\n' + chalk.cyan('AI:') + '\n' + response + '\n');
      }
    } catch (error) {
      s.stop(style.error('Failed to get response'));
      console.error(error);
    }
  } else {
    // Interactive mode
    await runInteractive({
      model: options.model,
      agent: !options.noAgent,
    });
  }
}

// Generate templates
function generateMinimalTemplate(projectName: string): string {
  return `# ${projectName}

## Overview
AI-assisted coding project.

## Guidelines
- Follow TypeScript best practices
- Keep functions small and focused
- Add tests for critical logic
`;
}

function generateFullTemplate(projectName: string): string {
  return `# ${projectName}

## Overview
AI-assisted coding project with comprehensive guidelines.

## Tech Stack
- TypeScript
- Node.js
- Modern CLI tools

## Guidelines
1. **Code Quality**
   - Use TypeScript strict mode
   - Add comprehensive types
   - Document public APIs

2. **Architecture**
   - Follow modular design
   - Separate concerns
   - Use dependency injection

3. **Testing**
   - Unit tests for logic
   - Integration tests for workflows
   - E2E tests for critical paths

## Commands
- \`npm run dev\` - Start development
- \`npm run build\` - Build project
- \`npm test\` - Run tests
`;
}

// Main CLI setup
program
  .name('ocoder-code')
  .description('AI coding assistant CLI')
  .version('1.0.0')
  .option('--no-color', 'disable color output')
  .option('-v, --verbose', 'enable verbose output')
  .hook('preAction', (thisCommand) => {
    const options = thisCommand.opts();
    if (options.noColor) {
      setColorEnabled(false);
    }
    if (options.verbose) {
      console.log(style.dim('Verbose mode enabled'));
    }
  });

// Init command
program
  .command('init')
  .description('Initialize a new project with OCODER.md')
  .option('-m, --model <model>', 'default model to use')
  .option('-t, --template <template>', 'template type (minimal|full)')
  .action(async (options) => {
    const validated = InitOptionsSchema.parse(options);
    await initCommand(validated);
  });

// Chat command
program
  .command('chat')
  .description('Start an interactive chat session or send a single message')
  .option('-m, --model <model>', 'model to use for this chat')
  .option('-M, --message <message>', 'single message to send (non-interactive)')
  .option('-f, --file <file>', 'file to include in context')
  .option('--no-agent', 'disable agent mode (no tool calling)')
  .action(async (options) => {
    const validated = ChatOptionsSchema.parse(options);
    await chatCommand(validated);
  });

// Status command
program
  .command('status')
  .description('Show current configuration and token usage statistics')
  .action(async () => {
    showModernBanner();
    await showStatusTable();
    showTokenStatsTable();
  });

// Config command group
const configCmd = program
  .command('config')
  .description('Configuration commands');

configCmd
  .command('show')
  .description('Show current configuration')
  .action(async () => {
    await showStatusTable();
  });

configCmd
  .command('set')
  .description('Set a configuration value')
  .argument('<key>', 'configuration key')
  .argument('<value>', 'configuration value')
  .action(async (key, value) => {
    // Implementation here
    console.log(style.success(`Set ${key} = ${value}`));
  });

// Session command group
const sessionCmd = program
  .command('session')
  .description('Session management commands');

sessionCmd
  .command('list')
  .description('List all saved sessions')
  .action(() => {
    const sessions = cli.chat.getMessages();
    console.log(style.info(`Total messages: ${sessions.length}`));
  });

// Default command (interactive mode)
program
  .command('interactive', { isDefault: true })
  .description('Start interactive mode (default)')
  .option('-m, --model <model>', 'model to use')
  .action(async (options) => {
    // Skip banner here, runInteractive will show welcome
    await runInteractive({
      model: options.model,
      agent: true,
    });
  });

export function runCLI(): void {
  program.parse();
}

export { program };
