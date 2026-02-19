import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface Config {
  model: string;
  apiBase: string;
  apiKey: string;
  permissions: {
    allow: string[];
    deny: string[];
    ask: string[];
  };
  env: Record<string, string>;
  hooks: Record<string, any[]>;
  sandbox: { enabled: boolean };
  outputStyle: string;
  agentEnabled?: boolean;
}

const DEFAULT_CONFIG: Config = {
  model: 'deepseek-chat',
  apiBase: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  permissions: {
    allow: ['Read', 'Glob', 'Grep', 'Bash(npm run:*)', 'Bash(git:*)', 'Edit(src/**)', 'Write(src/**)'],
    deny: ['Read(.env*)', 'Bash(rm -rf:*)'],
    ask: ['WebFetch', 'Bash(docker:*)'],
  },
  env: {},
  hooks: {},
  sandbox: { enabled: false },
  outputStyle: 'Explanatory',
};

function getConfigPaths(): string[] {
  const home = os.homedir();
  const platform = process.platform;
  const paths: string[] = [];

  if (platform === 'win32') {
    paths.push(path.join(process.env.APPDATA || '', 'ocoder-code', 'settings.json'));
  } else {
    paths.push(path.join(home, '.config', 'ocoder-code', 'settings.json'));
  }

  paths.push(path.join(home, '.ocoder.json'));
  paths.push(path.join(process.cwd(), '.ocoder', 'settings.json'));
  paths.push(path.join(process.cwd(), '.ocoder', 'settings.local.json'));

  return paths;
}

export async function loadConfig(): Promise<Config> {
  const configPaths = getConfigPaths();
  let config = { ...DEFAULT_CONFIG };

  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        config = { ...config, ...fileConfig };
      }
    } catch (e) {
    }
  }

  if (!config.apiKey) {
    config.apiKey = process.env.DEEPSEEK_API_KEY || '';
  }

  return config;
}

export function getApiKey(): string {
  return process.env.DEEPSEEK_API_KEY || '';
}

export function getConfigDir(): string {
  const home = os.homedir();
  const platform = process.platform;
  
  if (platform === 'win32') {
    return path.join(process.env.APPDATA || '', 'ocoder-code');
  }
  return path.join(home, '.config', 'ocoder-code');
}

export function ensureConfigDir(): void {
  const configDir = getConfigDir();
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

export async function saveConfig(config: Partial<Config>): Promise<void> {
  ensureConfigDir();
  const configPath = path.join(getConfigDir(), 'settings.json');
  
  let existingConfig: Config = { ...DEFAULT_CONFIG };
  if (fs.existsSync(configPath)) {
    try {
      existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
    }
  }
  
  const mergedConfig = { ...existingConfig, ...config };
  fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2), 'utf-8');
}

export function getDataDir(): string {
  return path.join(getConfigDir(), 'data');
}

export function ensureDataDir(): void {
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export function saveDataFile(filename: string, data: any): string {
  ensureDataDir();
  const filePath = path.join(getDataDir(), filename);
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

export function loadDataFile(filename: string): any | null {
  const filePath = path.join(getDataDir(), filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    try {
      return JSON.parse(content);
    } catch (e) {
      return content;
    }
  } catch (e) {
    return null;
  }
}

export function listDataFiles(): string[] {
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    return [];
  }
  return fs.readdirSync(dataDir);
}

export function deleteDataFile(filename: string): boolean {
  const filePath = path.join(getDataDir(), filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

export function getStorageDir(): string {
  return path.join(getConfigDir(), 'storage');
}

export function ensureStorageDir(): void {
  const storageDir = getStorageDir();
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
}

export function createStorageFolder(folderName: string): string {
  ensureStorageDir();
  const folderPath = path.join(getStorageDir(), folderName);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  return folderPath;
}

export function saveToFolder(folderName: string, filename: string, data: any): string {
  const folderPath = path.join(getStorageDir(), folderName);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  
  const filePath = path.join(folderPath, filename);
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

export function loadFromFolder(folderName: string, filename: string): any | null {
  const filePath = path.join(getStorageDir(), folderName, filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    try {
      return JSON.parse(content);
    } catch (e) {
      return content;
    }
  } catch (e) {
    return null;
  }
}

export function listFolderFiles(folderName: string): string[] {
  const folderPath = path.join(getStorageDir(), folderName);
  if (!fs.existsSync(folderPath)) {
    return [];
  }
  return fs.readdirSync(folderPath);
}

export function deleteFolder(folderName: string): boolean {
  const folderPath = path.join(getStorageDir(), folderName);
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
    return true;
  }
  return false;
}

export function listStorageFolders(): string[] {
  const storageDir = getStorageDir();
  if (!fs.existsSync(storageDir)) {
    return [];
  }
  return fs.readdirSync(storageDir).filter(f => {
    return fs.statSync(path.join(storageDir, f)).isDirectory();
  });
}

export function getStorageInfo(): { folders: string[]; totalSize: number } {
  const storageDir = getStorageDir();
  let totalSize = 0;
  
  if (!fs.existsSync(storageDir)) {
    return { folders: [], totalSize: 0 };
  }
  
  const folders = fs.readdirSync(storageDir).filter(f => {
    return fs.statSync(path.join(storageDir, f)).isDirectory();
  });
  
  for (const folder of folders) {
    const folderPath = path.join(storageDir, folder);
    totalSize += getFolderSize(folderPath);
  }
  
  return { folders, totalSize };
}

function getFolderSize(folderPath: string): number {
  let size = 0;
  const files = fs.readdirSync(folderPath);
  
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      size += stat.size;
    }
  }
  
  return size;
}
