import * as fs from 'fs';
import * as path from 'path';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const backgroundProcesses: Map<string, ChildProcess> = new Map();

export async function executeBash(command: string, cwd?: string): Promise<{ output: string; exitCode: number }> {
  try {
    const options: any = { 
      cwd: cwd || process.cwd(), 
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
    };
    
    if (process.platform === 'win32') {
      options.shell = true;
    }
    
    const { stdout, stderr } = await execAsync(command, options);
    return { output: String(stdout) + String(stderr), exitCode: 0 };
  } catch (error: any) {
    return { output: String(error.stdout) + String(error.stderr), exitCode: error.code || 1 };
  }
}

export async function executeBashBackground(command: string, cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
    const args = process.platform === 'win32' ? ['/c', command] : ['-c', command];
    
    const proc = spawn(shell, args, { cwd: cwd || process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
    const id = `shell_${Date.now()}`;
    
    backgroundProcesses.set(id, proc);
    
    proc.on('error', reject);
    proc.stdout?.on('data', () => {});
    proc.stderr?.on('data', () => {});
    
    resolve(id);
  });
}

export async function getBashOutput(bashId: string, filter?: string): Promise<{ output: string; status: string }> {
  const proc = backgroundProcesses.get(bashId);
  if (!proc) {
    return { output: '', status: 'not_found' };
  }
  
  if (proc.killed || proc.exitCode !== null) {
    backgroundProcesses.delete(bashId);
    return { output: '', status: 'done' };
  }
  
  return { output: '', status: 'running' };
}

export async function killShell(shellId: string): Promise<boolean> {
  const proc = backgroundProcesses.get(shellId);
  if (!proc) {
    return false;
  }
  
  proc.kill();
  backgroundProcesses.delete(shellId);
  return true;
}

export async function globFiles(pattern: string, searchPath?: string): Promise<string[]> {
  const basePath = searchPath || process.cwd();
  
  if (process.platform === 'win32') {
    const { stdout } = await execAsync(`dir /b /s "${basePath}\\${pattern}"`, { cwd: basePath });
    return stdout.split('\n').filter(line => line.trim()).slice(0, 50);
  } else {
    const { stdout } = await execAsync(`find "${basePath}" -maxdepth 10 -name "${pattern}" 2>/dev/null | head -50`, { cwd: basePath });
    return stdout.split('\n').filter(line => line.trim());
  }
}

export async function grepSearch(query: string, searchPath?: string, includes?: string): Promise<string[]> {
  const basePath = searchPath || process.cwd();
  const ext = includes || '*';
  
  if (process.platform === 'win32') {
    const { stdout } = await execAsync(`findstr /s /n /i "${query}" "${basePath}\\*.${ext}" 2>nul | head -50`, { cwd: basePath });
    return stdout.split('\n').filter(line => line.trim());
  } else {
    const { stdout } = await execAsync(`grep -rn --include="*.${ext}" "${query}" "${basePath}" 2>/dev/null | head -50`, { cwd: basePath });
    return stdout.split('\n').filter(line => line.trim());
  }
}

export async function readFile(filePath: string, offset?: number, limit?: number): Promise<string> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const start = offset ? offset - 1 : 0;
  const end = limit ? start + limit : lines.length;
  
  return lines.slice(start, end).map((line, i) => `${start + i + 1}\t${line}`).join('\n');
}

export async function editFile(filePath: string, oldString: string, newString: string): Promise<string> {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes(oldString)) {
    throw new Error('old_string not found in file');
  }
  
  const newContent = content.replace(oldString, newString);
  fs.writeFileSync(filePath, newContent, 'utf-8');
  return 'File edited successfully';
}

export async function writeFile(filePath: string, content: string): Promise<string> {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
  return 'File written successfully';
}

import { generateFileTree } from './tree';

export async function executeTool(name: string, args: any): Promise<string> {
  if (name === 'Bash') {
    const cmd = args.command?.toLowerCase() || '';
    
    const readFilePatterns = [
      /^head\s+-n?\s*(\d+)?\s+["']?([^"'\s]+)/i,
      /^tail\s+-n?\s*(\d+)?\s+["']?([^"'\s]+)/i,
      /^cat\s+["']?([^"'\s]+)/i,
      /^type\s+["']?([^"'\s]+)/i,
      /^more\s+["']?([^"'\s]+)/i,
      /^less\s+["']?([^"'\s]+)/i,
    ];
    
    for (const pattern of readFilePatterns) {
      const match = cmd.match(pattern);
      if (match) {
        const filePath = match[2];
        const lines = match[1] ? parseInt(match[1]) : 100;
        
        try {
          const content = await readFile(filePath, 1, lines);
          return `[Auto-converted from Bash to Read tool]\n${content}`;
        } catch (e: any) {
          return `[Auto-converted from Bash to Read tool]\nError reading file: ${e.message}`;
        }
      }
    }
    
    if (args.run_in_background) {
      return await executeBashBackground(args.command, args.cwd);
    }
    return (await executeBash(args.command, args.cwd)).output;
  }
  
  switch (name) {
    case 'Glob':
      return (await globFiles(args.pattern, args.search_path)).join('\n');
    case 'Grep':
      return (await grepSearch(args.query, args.path, args.includes)).join('\n');
    case 'Read':
      return await readFile(args.file_path, args.offset, args.limit);
    case 'Edit':
      return await editFile(args.file_path, args.old_string, args.new_string);
    case 'Write':
      return await writeFile(args.file_path, args.content);
    case 'NotebookEdit':
      return await editNotebook(args.notebook_path, args.new_source, args.cell_id, args.cell_type, args.edit_mode);
    case 'WebFetch':
      return await webFetch(args.url, args.prompt);
    case 'WebSearch':
      return await webSearch(args.query, args.allowed_domains, args.blocked_domains);
    case 'TodoWrite':
      return JSON.stringify(args.todos);
    case 'ExitPlanMode':
      return 'ExitPlanMode: ' + args.plan;
    case 'BashOutput':
      return JSON.stringify(await getBashOutput(args.bash_id, args.filter));
    case 'KillShell':
      return JSON.stringify({ success: await killShell(args.shell_id) });
    case 'Task':
      return `Task subagent: ${args.subagent_type} - ${args.description}`;
    case 'SlashCommand':
      return `Execute command: ${args.command_name}`;
    case 'Tree':
      return generateFileTree(args.path || process.cwd(), { maxDepth: args.depth || 3 });
    default:
      return `Tool ${name} not implemented`;
  }
}

async function editNotebook(notebookPath: string, newSource: string, cellId?: string, cellType?: string, editMode?: string): Promise<string> {
  try {
    const content = fs.readFileSync(notebookPath, 'utf-8');
    const nb = JSON.parse(content);
    
    if (editMode === 'delete' && cellId) {
      nb.cells = nb.cells.filter((c: any) => c.id !== cellId);
    } else if (editMode === 'insert' && cellId) {
      const idx = nb.cells.findIndex((c: any) => c.id === cellId);
      const newCell = { id: `cell_${Date.now()}`, cell_type: cellType || 'code', source: newSource, outputs: [] };
      nb.cells.splice(idx + 1, 0, newCell);
    } else if (cellId) {
      const cell = nb.cells.find((c: any) => c.id === cellId);
      if (cell) {
        cell.source = newSource;
      }
    } else {
      nb.cells.push({ id: `cell_${Date.now()}`, cell_type: cellType || 'code', source: newSource, outputs: [] });
    }
    
    fs.writeFileSync(notebookPath, JSON.stringify(nb, null, 2), 'utf-8');
    return 'Notebook edited successfully';
  } catch (e: any) {
    return `Error: ${e.message}`;
  }
}

async function webFetch(url: string, prompt: string): Promise<string> {
  try {
    const axios = require('axios');
    const response = await axios.get(url, { timeout: 10000 });
    return `Fetched ${url}: ${response.data.length} bytes (prompt: ${prompt})`;
  } catch (e: any) {
    return `Error fetching ${url}: ${e.message}`;
  }
}

async function webSearch(query: string, allowedDomains?: string[], blockedDomains?: string[]): Promise<string> {
  return `Web search: ${query} (allowed: ${allowedDomains?.join(', ') || 'all'}, blocked: ${blockedDomains?.join(', ') || 'none'})`;
}
