import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export interface TreeOptions {
  maxDepth?: number;
  exclude?: string[];
}

export function generateFileTree(rootPath: string, options: TreeOptions = {}): string {
  const maxDepth = options.maxDepth || 3;
  const exclude = options.exclude || ['node_modules', '.git', 'dist', 'build', '.next'];
  
  let output = '';
  
  function walk(dir: string, prefix: string, depth: number) {
    if (depth > maxDepth) return;
    
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
      
      output += prefix + connector + (isDir ? chalk.cyan(item) : item) + (isDir ? '/' : '') + '\n';
      
      if (isDir && depth < maxDepth) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        walk(path.join(dir, item), newPrefix, depth + 1);
      }
    }
  }
  
  const rootName = path.basename(rootPath);
  output = chalk.cyan(rootName) + '/\n';
  walk(rootPath, '', 1);
  
  return output;
}
