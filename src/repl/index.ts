import { loadConfig } from '../config';
import { createApiClient, Message } from '../api';
import { getToolsForModel } from '../tools';
import { executeTool, parseToolCalls } from '../tools/executor';
import { renderMarkdown } from '../ui/renderer';
import { showWelcome } from '../ui/display';
import { cli, CLIFacade } from '../ui/facade';
import modernUI from '../ui/modern';
import { saveSession, loadSession, listSessions, deleteSession, SessionData } from '../session';
import * as readline from 'readline';
import chalk from 'chalk';

const SLASH_COMMANDS = [
  { name: '/help', description: 'Show available commands' },
  { name: '/init', description: 'Initialize project OCODER.md' },
  { name: '/clear', description: 'Clear conversation history' },
  { name: '/compact', description: 'Compact context window' },
  { name: '/config', description: 'Open configuration menu' },
  { name: '/resume', description: 'Show resumable sessions' },
  { name: '/status', description: 'Show CLI status and statistics' },
  { name: '/sessions', description: 'List all sessions' },
  { name: '/delete', description: 'Delete a session' },
  { name: '/exit', description: 'Exit the program' },
];

export interface RunOptions {
  model?: string;
  outputFormat?: string;
  addDir?: string;
  agent?: boolean;
  resumeSessionId?: string;
}

let currentSession: SessionData | null = null;
let sessionMessages: Message[] = [];

export async function runPrompt(prompt: string, options: RunOptions): Promise<void> {
  const config = await loadConfig();
  const api = createApiClient(config);

  const messages: Message[] = [
    { role: 'system', content: getSystemPrompt(options.model || 'deepseek-chat') },
    { role: 'user', content: prompt },
  ];

  const tools = options.agent ? getToolsForModel(options.model || 'deepseek-chat') : undefined;

  const spinner = modernUI.spinner.start('Thinking...');

  try {
    const result = await api.chat(messages, tools, false);
    spinner.stop();

    if (options.outputFormat === 'json') {
      console.log(JSON.stringify({
        type: 'result',
        subtype: 'success',
        result: result.response.choices[0]?.message?.content || '',
        session_id: result.response.id,
      }, null, 2));
    } else {
      console.log(result.response.choices[0]?.message?.content || '');
    }
  } catch (error: any) {
    spinner.stop();
    console.error(chalk.red('Error:'), error.message);
  }
}

export async function runInteractive(options: RunOptions): Promise<void> {
  const config = await loadConfig();
  const model = options.model || config.model || 'deepseek-chat';

  if (options.resumeSessionId) {
    const loaded = loadSession(options.resumeSessionId);
    if (loaded) {
      currentSession = loaded;
      sessionMessages = loaded.messages;
    } else {
      cli.log.error(`Session ${options.resumeSessionId} not found, creating new session`, 'Session');
      currentSession = createNewSession(model);
    }
  } else {
    currentSession = createNewSession(model);
  }

  // Use modern UI
  modernUI.banner();
  modernUI.welcomeBox(config.model, currentSession.id);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('❯ '),
    completer: (line: string) => {
      const commands = SLASH_COMMANDS.map(cmd => cmd.name);
      const hits = commands.filter(cmd => cmd.startsWith(line));
      return [hits.length ? hits[0] : line, line];
    }
  });

  rl.on('line', async (input) => {
    const line = input.trim();

    if (!line) {
      rl.prompt();
      return;
    }

    if (line.startsWith('/')) {
      await handleSlashCommand(line, rl);
      return;
    }

    if (!currentSession) return;

    sessionMessages.push({ role: 'user', content: line });

    const spinner = modernUI.spinner.start('Thinking...');

    try {
      const config = await loadConfig();
      const api = createApiClient(config);
      const tools = options.agent !== false ? getToolsForModel(model) : undefined;

      let result = await api.chat(sessionMessages, tools, false);
      spinner.stop();

      // Record token usage if available
      const usage = (result.response as any).usage;
      if (usage) {
        cli.recordTokenUsage(
          usage.prompt_tokens || 0,
          usage.completion_tokens || 0,
          model,
          'chat'
        );
      }

      const rawChoice = (result.response as any).choices?.[0];
      const rawMessage = rawChoice?.message;
      
      let fullContent = rawMessage?.content || '';
      let toolCalls: any[] = rawMessage?.tool_calls || [];
      
      if (!fullContent && toolCalls.length === 0) {
        console.log(chalk.yellow('No response from API'));
        rl.prompt();
        return;
      }

      const xmlToolCalls = parseToolCalls(fullContent || '');

      while (toolCalls.length > 0 || xmlToolCalls.length > 0) {
        console.log();
        
        for (const toolCall of toolCalls) {
          const toolName = toolCall.function?.name || 'Unknown';
          modernUI.toolStart(toolName);
          
          try {
            const funcArgs = toolCall.function?.arguments;
            const args = typeof funcArgs === 'string' ? JSON.parse(funcArgs) : funcArgs || {};
            const result = await executeTool(toolName, args);
            const output = result.success ? result.output : `[Error] ${result.error}`;
            
            if (result.success) {
              modernUI.toolSuccess(toolName);
            } else {
              modernUI.toolError(toolName, result.error || 'Unknown error');
            }

            sessionMessages.push({
              role: 'assistant',
              content: fullContent || '',
              toolCalls: toolCall.id ? [{
                id: toolCall.id,
                type: 'function' as const,
                function: toolCall.function,
              }] : [],
            });
            sessionMessages.push({
              role: 'user',
              content: `[Tool ${toolCall.function.name} result]: ${output}`,
            });
          } catch (toolError: any) {
            console.log(chalk.red(`  Error: ${toolError.message}`));
            sessionMessages.push({
              role: 'user',
              content: `[Tool ${toolCall.function.name} error]: ${toolError.message}`,
            });
          }
        }

        for (const tc of xmlToolCalls) {
          modernUI.toolStart(tc.name);
          try {
            const result = await executeTool(tc.name, tc.args);
            const output = result.success ? result.output : `[Error] ${result.error}`;
            if (result.success) {
              modernUI.toolSuccess(tc.name);
            } else {
              modernUI.toolError(tc.name, result.error || 'Unknown error');
            }
            
            sessionMessages.push({
              role: 'user',
              content: `[Tool ${tc.name} result]: ${output}`,
            });
          } catch (toolError: any) {
            console.log(chalk.red(`  Error: ${toolError.message}`));
            sessionMessages.push({
              role: 'user',
              content: `[Tool ${tc.name} error]: ${toolError.message}`,
            });
          }
        }

        result = await api.chat(sessionMessages, tools, false);
        const nextRawChoice = (result.response as any).choices?.[0];
        const nextRawMessage = nextRawChoice?.message;
        
        const newToolCalls = nextRawMessage?.tool_calls || [];
        const newXmlToolCalls = parseToolCalls(nextRawMessage?.content || '');
        
        if (newToolCalls.length > 0 || newXmlToolCalls.length > 0) {
          toolCalls.length = 0;
          xmlToolCalls.length = 0;
          toolCalls.push(...newToolCalls);
          xmlToolCalls.push(...newXmlToolCalls);
        } else {
          if (nextRawMessage?.content) {
            const textContent = nextRawMessage.content.replace(/<\w+>[\s\S]*?<\/\w+>/g, '').trim();
            if (textContent) {
              console.log();
              await renderMarkdown(textContent);
              console.log();
            }
          }
          break;
        }
      }

      if (fullContent && toolCalls.length === 0 && xmlToolCalls.length === 0) {
        const textContent = fullContent.replace(/<\w+>[\s\S]*?<\/\w+>/g, '').trim();
        if (textContent) {
          console.log();
          await renderMarkdown(textContent);
          console.log();
        }
        sessionMessages.push({ role: 'assistant', content: fullContent });
      }

      currentSession.messages = sessionMessages;
      saveSession(currentSession);
    } catch (error: any) {
      spinner.stop();
      console.error(chalk.red('Error:'), error.message);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log(chalk.gray('\nGoodbye!'));
    if (currentSession) {
      saveSession(currentSession);
    }
    process.exit(0);
  });

  rl.prompt();
}

function createNewSession(model: string): SessionData {
  const session: SessionData = {
    id: `session_${Date.now()}`,
    model,
    messages: [
      { role: 'system', content: getSystemPrompt(model) },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  sessionMessages = session.messages;
  saveSession(session);
  return session;
}

async function handleSlashCommand(input: string, rl: readline.Interface): Promise<void> {
  const parts = input.split(' ');
  const cmd = parts[0];
  const arg = parts.slice(1).join(' ');

  switch (cmd) {
    case '/help':
      console.log(chalk.cyan('\nAvailable commands:'));
      SLASH_COMMANDS.forEach(c => console.log(`  ${c.name.padEnd(15)} ${c.description}`));
      console.log();
      break;
    case '/clear':
      if (currentSession) {
        sessionMessages = sessionMessages.slice(0, 1);
        currentSession.messages = sessionMessages;
        saveSession(currentSession);
        console.log(chalk.gray('Conversation cleared.\n'));
      }
      break;
    case '/compact':
      if (sessionMessages.length > 10) {
        const systemMsg = sessionMessages[0];
        const recentMsgs = sessionMessages.slice(-10);
        sessionMessages = [systemMsg, ...recentMsgs];
        if (currentSession) {
          currentSession.messages = sessionMessages;
          saveSession(currentSession);
        }
        console.log(chalk.gray('Context compacted.\n'));
      }
      break;
    case '/status':
      if (currentSession) {
        modernUI.statusBox('Session', [
          ['ID', currentSession.id.slice(0, 20) + '...'],
          ['Model', currentSession.model],
          ['Messages', currentSession.messages.length.toString()],
          ['Created', new Date(currentSession.createdAt).toLocaleString()],
        ]);
        
        // Show token stats
        const stats = cli.tokenStats.getStats();
        modernUI.tokenStats({
          totalCalls: stats.totalCalls,
          totalTokens: stats.totalTokens,
          promptTokens: stats.totalPromptTokens,
          completionTokens: stats.totalCompletionTokens,
          averagePerCall: stats.averagePerCall,
        });
      }
      break;
    case '/help':
      modernUI.help();
      break;
    case '/sessions':
      const sessions = listSessions();
      if (sessions.length === 0) {
        console.log(chalk.gray('  No saved sessions\n'));
      } else {
        modernUI.statusBox('Sessions', sessions.map(s => [
          'ID',
          `${s.id.slice(0, 16)}... (${s.model})`
        ]) as [string, string][]);
      }
      break;
    case '/resume':
      const allSessions = listSessions();
      if (allSessions.length === 0) {
        console.log(chalk.gray('  No sessions to resume\n'));
      } else {
        modernUI.statusBox('Available Sessions', allSessions.map(s => [
          'ID',
          s.id.slice(0, 20) + '...'
        ]) as [string, string][]);
      }
      break;
    case '/delete':
      if (arg) {
        if (deleteSession(arg)) {
          modernUI.success(`Session ${arg} deleted`);
        } else {
          modernUI.error(`Session ${arg} not found`);
        }
      } else {
        modernUI.warn('Usage: /delete <session-id>');
      }
      break;
    case '/init':
      modernUI.info('Run "ocoder-code init" to initialize OCODER.md');
      break;
    case '/config':
      modernUI.info('Run "ocoder-code config" to manage configuration');
      break;
    case '/exit':
    case '/quit':
      rl.close();
      return;
    default:
      modernUI.warn(`Unknown command: ${cmd}. Type /help for available commands.`);
  }

  rl.prompt();
}

function getSystemPrompt(model: string): string {
  return `You are ocoder-code, an AI coding assistant. Help the user with their request.

You can:
- Create files by describing what should be in them
- Run shell commands by describing them
- Read and modify existing files
- Answer questions about code

Be direct and helpful. Do not ask unnecessary questions.`;
}
