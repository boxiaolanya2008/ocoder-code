import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface Hook {
  type: 'command' | 'agent';
  command?: string;
  agent?: string;
}

export interface HookConfig {
  matcher: string;
  hooks: Hook[];
}

export interface HooksConfig {
  PreToolUse?: HookConfig[];
  PostToolUse?: HookConfig[];
}

const HOOKS_DIR = '.ocoder/hooks';

export function loadHooks(): HooksConfig {
  const hooksFile = path.join(process.cwd(), HOOKS_DIR, 'hooks.json');
  const homeHooksFile = path.join(process.env.HOME || process.env.USERPROFILE || '', '.ocoder-code', 'hooks.json');

  try {
    if (fs.existsSync(hooksFile)) {
      return JSON.parse(fs.readFileSync(hooksFile, 'utf-8'));
    }
    if (fs.existsSync(homeHooksFile)) {
      return JSON.parse(fs.readFileSync(homeHooksFile, 'utf-8'));
    }
  } catch (e) {
  }

  return {};
}

export async function runPreToolUseHooks(toolName: string, toolArgs: any): Promise<boolean> {
  const hooks = loadHooks();
  const preHooks = hooks.PreToolUse || [];

  for (const hook of preHooks) {
    if (matchTool(toolName, hook.matcher)) {
      for (const action of hook.hooks) {
        if (action.type === 'command' && action.command) {
          const cmd = interpolateCommand(action.command, toolName, toolArgs);
          try {
            await execAsync(cmd);
          } catch (e) {
            console.log(`Hook warning: ${e}`);
          }
        }
      }
    }
  }

  return true;
}

export async function runPostToolUseHooks(toolName: string, toolArgs: any, result: string): Promise<void> {
  const hooks = loadHooks();
  const postHooks = hooks.PostToolUse || [];

  for (const hook of postHooks) {
    if (matchTool(toolName, hook.matcher)) {
      for (const action of hook.hooks) {
        if (action.type === 'command' && action.command) {
          const cmd = interpolateCommand(action.command, toolName, toolArgs);
          try {
            await execAsync(cmd);
          } catch (e) {
            console.log(`Hook warning: ${e}`);
          }
        }
      }
    }
  }
}

function matchTool(toolName: string, matcher: string): boolean {
  if (matcher === '*') return true;
  const patterns = matcher.split('|');
  return patterns.some(p => {
    const regex = new RegExp('^' + p.replace(/\*/g, '.*') + '$');
    return regex.test(toolName);
  });
}

function interpolateCommand(cmd: string, toolName: string, toolArgs: any): string {
  return cmd
    .replace(/\$TOOL_NAME/g, toolName)
    .replace(/\$TOOL_ARGS/g, JSON.stringify(toolArgs))
    .replace(/\$FILE_PATH/g, toolArgs.file_path || toolArgs.notebook_path || '')
    .replace(/\$COMMAND/g, toolArgs.command || '');
}

export function getHooksDir(): string {
  return HOOKS_DIR;
}

export function initHooksDir(): void {
  const hooksDir = path.join(process.cwd(), HOOKS_DIR);
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  const exampleHooks = {
    PreToolUse: [],
    PostToolUse: [
      {
        matcher: 'Edit|Write',
        hooks: [
          {
            type: 'command',
            command: 'npx prettier --write "$FILE_PATH"'
          }
        ]
      }
    ]
  };

  const hooksFile = path.join(hooksDir, 'hooks.json');
  if (!fs.existsSync(hooksFile)) {
    fs.writeFileSync(hooksFile, JSON.stringify(exampleHooks, null, 2), 'utf-8');
  }
}
