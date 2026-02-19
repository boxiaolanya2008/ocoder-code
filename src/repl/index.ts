import { loadConfig } from '../config';
import { createApiClient, Message } from '../api';
import { getToolsForModel } from '../tools';
import { executeTool, parseToolCalls } from '../tools/executor';
import { renderMarkdown } from '../ui/renderer';
import { showStatus } from '../ui/status';
import { saveSession, loadSession, listSessions, deleteSession, SessionData } from '../session';
import * as readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';

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

  const spinner = ora('Thinking...').start();

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
      console.log(chalk.yellow(`Session ${options.resumeSessionId} not found, creating new session`));
      currentSession = createNewSession(model);
    }
  } else {
    currentSession = createNewSession(model);
  }

  console.log(chalk.cyan('ocoder-code v1.0.0'));
  console.log(chalk.gray(`Model: ${model}`));
  console.log(chalk.gray(`Session: ${currentSession.id}`));
  console.log(chalk.gray('Type /help for available commands\n'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('> '),
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

    const spinner = ora('Thinking...').start();

    try {
      const config = await loadConfig();
      const api = createApiClient(config);
      const tools = options.agent !== false ? getToolsForModel(model) : undefined;

      let result = await api.chat(sessionMessages, tools, false);
      spinner.stop();

      const rawChoice = (result.response as any).choices?.[0];
      const rawMessage = rawChoice?.message;
      
      if (!rawMessage?.content && !rawMessage?.tool_calls) {
        console.log(chalk.yellow('No response from API'));
        rl.prompt();
        return;
      }

      const toolCalls = rawMessage?.tool_calls || [];
      const xmlToolCalls = parseToolCalls(rawMessage?.content || '');

      if (rawMessage.content) {
        const textContent = rawMessage.content.replace(/<\w+>[\s\S]*?<\/\w+>/g, '').trim();
        if (textContent) {
          console.log();
          await renderMarkdown(textContent);
          console.log();
        }
      }

      while (toolCalls.length > 0 || xmlToolCalls.length > 0) {
        console.log();
        
        for (const toolCall of toolCalls) {
          console.log(chalk.gray(`* Tool: ${toolCall.function?.name}`));
          try {
            const funcArgs = toolCall.function?.arguments;
            const args = typeof funcArgs === 'string' ? JSON.parse(funcArgs) : funcArgs || {};
            const result = await executeTool(toolCall.function.name, args);
            const output = result.success ? result.output : `[Error] ${result.error}`;
            console.log(chalk.gray(`  -> ${output}`));

            sessionMessages.push({
              role: 'assistant',
              content: rawMessage.content || '',
              toolCalls: [{
                id: toolCall.id,
                type: 'function' as const,
                function: toolCall.function,
              }],
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
          console.log(chalk.gray(`* XML Tool: ${tc.name}`));
          try {
            const result = await executeTool(tc.name, tc.args);
            const output = result.success ? result.output : `[Error] ${result.error}`;
            console.log(chalk.gray(`  -> ${output}`));
            
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
          console.log();
          if (nextRawMessage?.content) {
            const cleanContent = nextRawMessage.content.replace(/<\w+>[\s\S]*?<\/\w+>/g, '').trim();
            if (cleanContent) {
              await renderMarkdown(cleanContent);
              console.log();
              sessionMessages.push({ role: 'assistant', content: nextRawMessage.content });
            }
          }
          break;
        }
      }

      if (toolCalls.length === 0 && rawMessage?.content) {
        console.log();
        await renderMarkdown(rawMessage.content);
        console.log();
        sessionMessages.push({ role: 'assistant', content: rawMessage.content });
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
      showStatus(currentSession);
      break;
    case '/sessions':
      const sessions = listSessions();
      console.log(chalk.cyan('\nSessions:'));
      sessions.forEach(s => {
        console.log(`  ${s.id} - ${s.model} - ${new Date(s.updatedAt).toLocaleString()}`);
      });
      console.log();
      break;
    case '/resume':
      const allSessions = listSessions();
      console.log(chalk.cyan('\nAvailable sessions:'));
      allSessions.forEach(s => console.log(`  ${s.id}`));
      console.log();
      break;
    case '/delete':
      if (arg) {
        if (deleteSession(arg)) {
          console.log(chalk.gray(`Session ${arg} deleted.\n`));
        } else {
          console.log(chalk.yellow(`Session ${arg} not found.\n`));
        }
      } else {
        console.log(chalk.yellow('Usage: /delete <session-id>\n'));
      }
      break;
    case '/init':
      console.log(chalk.gray('OCODER.md would be initialized here.\n'));
      break;
    case '/config':
      console.log(chalk.gray('Config menu would open here.\n'));
      break;
    case '/exit':
    case '/quit':
      rl.close();
      return;
    default:
      console.log(chalk.yellow(`Unknown command: ${cmd}. Type /help for available commands.\n`));
  }

  rl.prompt();
}

function getSystemPrompt(model: string): string {
  return `You are ocoder-code, an AI coding assistant.

IMPORTANT - Project Analysis Rules:
When analyzing a project, you MUST:
1. First use "Glob" to get full file list
2. Then use "Read" to read key files (package.json, tsconfig.json, src/**/*.ts)
3. Collect ALL information before responding
4. Generate a comprehensive analysis report in ONE response

Do NOT respond with partial analysis. Make all tool calls first, then provide the complete report.

Tool Usage Rules:
- Use "Read" tool for file contents, NEVER use "Bash" with "head" or "cat"
- Use "Glob" tool for file listing
- Use "Tree" tool for directory structure
- Use "Grep" tool for code search
- Use "Bash" only for npm, git, etc.

Available tools:
- Read: Read files from the filesystem
- Glob: List files matching a pattern
- Tree: Generate directory tree view
- Grep: Search for content in files
- Bash: Execute shell commands
- Edit: Perform string replacements in files
- Write: Write or overwrite files

Be helpful, concise, and focus on writing high-quality code.`;
}
