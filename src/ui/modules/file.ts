import { UIComponent } from '../engine';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  isDirectory: boolean;
  modifiedTime: Date;
}

export class FileModule {
  async readFile(filePath: string): Promise<string> {
    return fs.promises.readFile(filePath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(filePath, content, 'utf-8');
  }

  async listDirectory(dirPath: string): Promise<FileInfo[]> {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    
    return Promise.all(
      entries.map(async entry => {
        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.promises.stat(fullPath);
        
        return {
          path: fullPath,
          name: entry.name,
          size: stats.size,
          isDirectory: entry.isDirectory(),
          modifiedTime: stats.mtime
        };
      })
    );
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export class FileUI extends UIComponent {
  private fileModule: FileModule;

  constructor(fileModule: FileModule) {
    super();
    this.fileModule = fileModule;
  }

  render(): string {
    return this.engine.renderBox('File Manager Ready', {
      title: 'Files',
      width: 60,
      color: 'blue'
    });
  }

  async renderFileList(dirPath: string): Promise<string> {
    const files = await this.fileModule.listDirectory(dirPath);
    
    const items = files.map(file => {
      const icon = file.isDirectory ? '📁' : '📄';
      const name = file.isDirectory 
        ? chalk.cyan(file.name + '/')
        : chalk.white(file.name);
      const size = this.formatSize(file.size);
      return `  ${icon} ${name.padEnd(30)} ${chalk.gray(size)}`;
    });

    return this.engine.renderBox(items.join('\n'), {
      title: `Directory: ${dirPath}`,
      width: 70,
      color: 'blue'
    });
  }

  async renderFileContent(filePath: string, maxLines: number = 30): Promise<string> {
    try {
      const content = await this.fileModule.readFile(filePath);
      const lines = content.split('\n').slice(0, maxLines);
      
      if (content.split('\n').length > maxLines) {
        lines.push(chalk.gray('... (truncated)'));
      }

      const lineNumbers = lines.map((line, i) => {
        const num = chalk.gray(`${(i + 1).toString().padStart(3)} │`);
        return `${num} ${line}`;
      });

      return this.engine.renderBox(lineNumbers.join('\n'), {
        title: `File: ${path.basename(filePath)}`,
        width: 80,
        color: 'blue'
      });
    } catch (error: any) {
      return this.engine.renderBox(chalk.red(`Error: ${error.message}`), {
        title: 'Error',
        width: 60,
        color: 'red'
      });
    }
  }

  renderFilePreview(filePath: string, content: string): string {
    const preview = content.slice(0, 500);
    const truncated = content.length > 500 ? chalk.gray('\n... (truncated)') : '';
    
    return this.engine.renderBox(chalk.cyan(preview) + truncated, {
      title: `Preview: ${path.basename(filePath)}`,
      width: 70,
      color: 'cyan'
    });
  }

  update(data: any): void {
    // Trigger re-render
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
