import * as fs from 'fs';
import * as path from 'path';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { applyDiff, insertLines, deleteLines } from './diff';
import { createTask, updateTodo, addTodo, getTaskStatus, requestUserInput, createCheckpoint, executeNextTodo } from './taskmanager';

const execAsync = promisify(exec);

const backgroundProcesses: Map<string, ChildProcess> = new Map();

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

export async function executeBash(command: string, cwd?: string): Promise<ToolResult> {
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
    return { success: true, output: String(stdout) + String(stderr) };
  } catch (error: any) {
    return { success: false, output: '', error: String(error.stdout) + String(error.stderr) };
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

export async function getBashOutput(bashId: string): Promise<ToolResult> {
  const proc = backgroundProcesses.get(bashId);
  if (!proc) {
    return { success: false, output: '', error: 'Shell not found' };
  }
  
  if (proc.killed || proc.exitCode !== null) {
    backgroundProcesses.delete(bashId);
    return { success: true, output: '', error: 'Shell completed' };
  }
  
  return { success: true, output: '' };
}

export async function killShell(shellId: string): Promise<ToolResult> {
  const proc = backgroundProcesses.get(shellId);
  if (!proc) {
    return { success: false, output: '', error: 'Shell not found' };
  }
  
  proc.kill();
  backgroundProcesses.delete(shellId);
  return { success: true, output: 'Shell terminated' };
}

export async function globFiles(pattern: string, searchPath?: string): Promise<ToolResult> {
  try {
    const basePath = searchPath || process.cwd();
    
    if (process.platform === 'win32') {
      const { stdout } = await execAsync(`dir /b /s "${basePath}\\${pattern}"`, { cwd: basePath });
      return { success: true, output: stdout.split('\n').filter(line => line.trim()).slice(0, 50).join('\n') };
    } else {
      const { stdout } = await execAsync(`find "${basePath}" -maxdepth 10 -name "${pattern}" 2>/dev/null | head -50`, { cwd: basePath });
      return { success: true, output: stdout.split('\n').filter(line => line.trim()).join('\n') };
    }
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

export async function grepSearch(query: string, searchPath?: string, includes?: string): Promise<ToolResult> {
  try {
    const basePath = searchPath || process.cwd();
    const ext = includes || '*';
    
    if (process.platform === 'win32') {
      const { stdout } = await execAsync(`findstr /s /n /i "${query}" "${basePath}\\*.${ext}" 2>nul | head -50`, { cwd: basePath });
      return { success: true, output: stdout.split('\n').filter(line => line.trim()).join('\n') };
    } else {
      const { stdout } = await execAsync(`grep -rn --include="*.${ext}" "${query}" "${basePath}" 2>/dev/null | head -50`, { cwd: basePath });
      return { success: true, output: stdout.split('\n').filter(line => line.trim()).join('\n') };
    }
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

export async function readFile(filePath: string, offset?: number, limit?: number): Promise<ToolResult> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const start = offset ? offset - 1 : 0;
    const end = limit ? start + limit : lines.length;
    const selectedLines = lines.slice(start, end);
    
    return { 
      success: true, 
      output: selectedLines.map((line, i) => `${start + i + 1}\t${line}`).join('\n') 
    };
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

export async function editFile(filePath: string, oldString: string, newString: string): Promise<ToolResult> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    if (!content.includes(oldString)) {
      return { success: false, output: '', error: 'old_string not found in file' };
    }
    
    const newContent = content.replace(oldString, newString);
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return { success: true, output: 'File edited successfully' };
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

export async function writeFile(filePath: string, content: string): Promise<ToolResult> {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, output: 'File written successfully' };
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

export async function listDir(dirPath: string): Promise<ToolResult> {
  try {
    const items = fs.readdirSync(dirPath);
    const output = items.map(item => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      return stat.isDirectory() ? `${item}/` : item;
    }).join('\n');
    return { success: true, output };
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

export async function createDir(dirPath: string): Promise<ToolResult> {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return { success: true, output: 'Directory created' };
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

export async function deleteFile(filePath: string): Promise<ToolResult> {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true, output: 'File deleted' };
    }
    return { success: false, output: '', error: 'File not found' };
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

export async function fileExists(filePath: string): Promise<ToolResult> {
  const exists = fs.existsSync(filePath);
  return { success: true, output: exists ? 'true' : 'false' };
}

export async function getFileInfo(filePath: string): Promise<ToolResult> {
  try {
    const stat = fs.statSync(filePath);
    const info = {
      size: stat.size,
      created: stat.birthtime,
      modified: stat.mtime,
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
    };
    return { success: true, output: JSON.stringify(info, null, 2) };
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

export async function webFetch(url: string, prompt: string): Promise<ToolResult> {
  try {
    const axios = require('axios');
    const response = await axios.get(url, { timeout: 10000 });
    return { success: true, output: `Fetched ${url}: ${response.data.length} bytes` };
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

export async function webSearch(query: string): Promise<ToolResult> {
  return { success: true, output: `Web search: ${query}` };
}

export function generateFileTree(rootPath: string, maxDepth: number = 3): string {
  const exclude = ['node_modules', '.git', 'dist', 'build', '.next'];
  let output = '';
  
  function walk(dir: string, prefix: string, depth: number) {
    if (depth > maxDepth) return;
    
    try {
      const items = fs.readdirSync(dir).filter(item => !exclude.includes(item));
      const dirs: string[] = [];
      const files: string[] = [];
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          dirs.push(item);
        } else {
          files.push(item);
        }
      }
      
      const allItems = [...dirs, ...files];
      
      for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        const isLast = i === allItems.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const isDir = dirs.includes(item);
        
        output += prefix + connector + (isDir ? item + '/' : item) + '\n';
        
        if (isDir && depth < maxDepth) {
          const newPrefix = prefix + (isLast ? '    ' : '│   ');
          walk(path.join(dir, item), newPrefix, depth + 1);
        }
      }
    } catch (e) {
    }
  }
  
  const rootName = path.basename(rootPath);
  output = rootName + '/\n';
  walk(rootPath, '', 1);
  
  return output;
}

export interface ToolCall {
  name: string;
  args: Record<string, any>;
}

const TOOL_REGEX = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>/g;

export function parseToolCalls(text: string): ToolCall[] {
  const calls: ToolCall[] = [];
  let match;
  
  const tempRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
  while ((match = tempRegex.exec(text)) !== null) {
    const toolName = match[1];
    let argsStr = match[2]?.trim() || match[3]?.trim() || '{}';
    
    let args: Record<string, any> = {};
    try {
      if (argsStr.startsWith('{')) {
        args = JSON.parse(argsStr);
      } else {
        const argPairs = argsStr.split(/\s+/);
        for (const pair of argPairs) {
          const [key, ...valueParts] = pair.split('=');
          if (key && valueParts.length > 0) {
            args[key] = valueParts.join('=');
          }
        }
      }
    } catch (e) {
      args = { _content: argsStr };
    }
    
    calls.push({ name: toolName, args });
  }
  
  return calls;
}

export async function executeTool(name: string, args: any): Promise<ToolResult> {
  const toolName = name.toLowerCase();
  
  switch (toolName) {
    case 'read_file':
    case 'read':
      return await readFile(args.path || args.file_path, args.offset, args.limit);
    
    case 'write_file':
    case 'write':
      return await writeFile(args.path || args.file_path, args.content);
    
    case 'edit_file':
    case 'edit':
      return await editFile(args.path || args.file_path, args.old_string || args.old, args.new_string || args.new);
    
    case 'delete_file':
    case 'delete':
      return await deleteFile(args.path || args.file_path);
    
    case 'list_dir':
    case 'ls':
      return await listDir(args.path || args.dir || '.');
    
    case 'create_dir':
    case 'mkdir':
      return await createDir(args.path || args.dir);
    
    case 'file_exists':
    case 'exists':
      return await fileExists(args.path || args.file_path);
    
    case 'get_file_info':
    case 'stat':
      return await getFileInfo(args.path || args.file_path);
    
    case 'glob':
      return await globFiles(args.pattern, args.path);
    
    case 'grep':
      return await grepSearch(args.query, args.path, args.includes);
    
    case 'run_command':
    case 'exec':
    case 'bash':
      if (args.background || args.bg) {
        const id = await executeBashBackground(args.command, args.cwd);
        return { success: true, output: `Background shell started: ${id}` };
      }
      return await executeBash(args.command, args.cwd);
    
    case 'shell_output':
    case 'bash_output':
      return await getBashOutput(args.id || args.bash_id);
    
    case 'kill_shell':
    case 'kill':
      return await killShell(args.id || args.shell_id);
    
    case 'web_fetch':
    case 'fetch':
      return await webFetch(args.url, args.prompt);
    
    case 'web_search':
    case 'search':
      return await webSearch(args.query);
    
    case 'tree':
      return { success: true, output: generateFileTree(args.path || '.', args.depth || 3) };
    
    case 'apply_diff':
      return await applyDiff(args.path, args.diff);
    
    case 'insert_lines':
      return await insertLines(args.path, args.line_number, args.content);
    
    case 'delete_lines':
      return await deleteLines(args.path, args.line_number, args.count);
    
    case 'create_task':
      return await createTask(args.title, args.description, args.todos);
    
    case 'update_todo':
      return await updateTodo(args.task_id, args.todo_id, args);
    
    case 'add_todo':
      return await addTodo(args.task_id, args.todo);
    
    case 'get_task_status':
      return await getTaskStatus(args.task_id);
    
    case 'request_user_input':
      return await requestUserInput(args.task_id, args.question, args.options, args.type);
    
    case 'create_checkpoint':
      return await createCheckpoint(args.task_id, args.message, args.show_context);
    
    case 'execute_next_todo':
      return await executeNextTodo(args.task_id);
    
    default:
      return { success: false, output: '', error: `Unknown tool: ${name}` };
  }
}
