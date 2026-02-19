import { spawn, ChildProcess } from 'child_process';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

export interface MCPConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPServer {
  name: string;
  config: MCPConfig;
  process?: ChildProcess;
  tools?: any[];
}

const mcpServers: Map<string, MCPServer> = new Map();

export async function loadMCPConfig(): Promise<Map<string, MCPConfig>> {
  const configs = new Map<string, MCPConfig>();

  const configPaths = [
    path.join(process.cwd(), '.ocoder', 'mcp.json'),
    path.join(process.env.HOME || '', '.ocoder-code', 'mcp.json'),
  ];

  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        for (const [name, serverConfig] of Object.entries(config.mcpServers || {})) {
          configs.set(name, serverConfig as MCPConfig);
        }
      }
    } catch (e) {
    }
  }

  return configs;
}

export async function startMCPServer(name: string, config: MCPConfig): Promise<void> {
  if (mcpServers.has(name)) {
    return;
  }

  const proc = spawn(config.command, config.args || [], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...config.env },
  });

  const server: MCPServer = {
    name,
    config,
    process: proc,
    tools: [],
  };

  mcpServers.set(name, server);

  proc.on('error', (e) => {
    console.log(`MCP server ${name} error: ${e.message}`);
  });

  proc.on('exit', (code) => {
    mcpServers.delete(name);
  });

  await initializeMCPServer(name, proc);
}

async function initializeMCPServer(name: string, proc: ChildProcess): Promise<void> {
  const server = mcpServers.get(name);
  if (!server) return;

  const rl = readline.createInterface({
    input: proc.stdout!,
    crlfDelay: Infinity,
  });

  const pendingRequests: Map<string, any> = new Map();
  let id = 1;

  const sendRequest = (method: string, params: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const requestId = String(id++);
      const request = { jsonrpc: '2.0', id: requestId, method, params };
      pendingRequests.set(requestId, { resolve, reject });
      proc.stdin!.write(JSON.stringify(request) + '\n');

      setTimeout(() => {
        if (pendingRequests.has(requestId)) {
          pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  };

  rl.on('line', (line) => {
    try {
      const response = JSON.parse(line);
      if (response.id && pendingRequests.has(response.id)) {
        const pending = pendingRequests.get(response.id);
        pendingRequests.delete(response.id);
        if (response.error) {
          pending.reject(new Error(response.error.message));
        } else {
          pending.resolve(response.result);
        }
      }
    } catch (e) {
    }
  });

  try {
    const result = await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'ocoder-code', version: '1.0.0' },
    });

    server.tools = result.tools || [];
    proc.stdin!.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  } catch (e) {
    console.log(`Failed to initialize MCP server ${name}: ${e}`);
  }
}

export function getMCPTools(): any[] {
  const tools: any[] = [];
  for (const server of mcpServers.values()) {
    if (server.tools) {
      for (const tool of server.tools) {
        tools.push({
          ...tool,
          name: `mcp__${server.name}__${tool.name}`,
        });
      }
    }
  }
  return tools;
}

export async function callMCPTool(serverName: string, toolName: string, args: any): Promise<string> {
  const server = mcpServers.get(serverName);
  if (!server || !server.process) {
    return JSON.stringify({ error: 'Server not found' });
  }

  return JSON.stringify({ result: 'MCP tool call placeholder' });
}

export async function stopMCPServer(name: string): Promise<void> {
  const server = mcpServers.get(name);
  if (server?.process) {
    server.process.kill();
    mcpServers.delete(name);
  }
}

export async function stopAllMCPServers(): Promise<void> {
  for (const name of mcpServers.keys()) {
    await stopMCPServer(name);
  }
}
