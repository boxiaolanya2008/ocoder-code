import { UIComponent } from '../engine';
import chalk from 'chalk';

export interface DiffBlock {
  type: 'add' | 'remove' | 'context';
  oldLine?: number;
  newLine?: number;
  content: string;
}

export interface DiffResult {
  oldPath: string;
  newPath: string;
  blocks: DiffBlock[];
  additions: number;
  deletions: number;
}

export class DiffModule {
  parseDiff(diffText: string): DiffResult[] {
    const results: DiffResult[] = [];
    const lines = diffText.split('\n');
    
    let currentResult: DiffResult | null = null;
    let oldLine = 0;
    let newLine = 0;

    for (const line of lines) {
      if (line.startsWith('--- ')) {
        if (currentResult) {
          results.push(currentResult);
        }
        currentResult = {
          oldPath: line.slice(4),
          newPath: '',
          blocks: [],
          additions: 0,
          deletions: 0
        };
      } else if (line.startsWith('+++ ')) {
        if (currentResult) {
          currentResult.newPath = line.slice(4);
        }
      } else if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        if (match) {
          oldLine = parseInt(match[1]);
          newLine = parseInt(match[3]);
        }
      } else if (line.startsWith('+')) {
        if (currentResult) {
          currentResult.blocks.push({
            type: 'add',
            newLine: newLine++,
            content: line.slice(1)
          });
          currentResult.additions++;
        }
      } else if (line.startsWith('-')) {
        if (currentResult) {
          currentResult.blocks.push({
            type: 'remove',
            oldLine: oldLine++,
            content: line.slice(1)
          });
          currentResult.deletions++;
        }
      } else if (line.startsWith(' ')) {
        if (currentResult) {
          currentResult.blocks.push({
            type: 'context',
            oldLine: oldLine++,
            newLine: newLine++,
            content: line.slice(1)
          });
        }
      }
    }

    if (currentResult) {
      results.push(currentResult);
    }

    return results;
  }

  generateDiff(oldContent: string, newContent: string, oldPath: string = 'a', newPath: string = 'b'): string {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    let diff = `--- ${oldPath}\n+++ ${newPath}\n`;
    
    // Simple line-by-line diff
    const maxLen = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLen; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];
      
      if (oldLine === undefined) {
        diff += `+${newLine}\n`;
      } else if (newLine === undefined) {
        diff += `-${oldLine}\n`;
      } else if (oldLine !== newLine) {
        diff += `-${oldLine}\n+${newLine}\n`;
      } else {
        diff += ` ${oldLine}\n`;
      }
    }
    
    return diff;
  }
}

export class DiffUI extends UIComponent {
  private diffModule: DiffModule;

  constructor(diffModule: DiffModule) {
    super();
    this.diffModule = diffModule;
  }

  render(): string {
    return this.engine.renderBox('Diff Viewer Ready', {
      title: 'Diff',
      width: 60,
      color: 'yellow'
    });
  }

  renderDiff(diffText: string): string {
    const results = this.diffModule.parseDiff(diffText);
    
    if (results.length === 0) {
      return this.engine.renderBox('No changes', {
        title: 'Diff',
        width: 60,
        color: 'gray'
      });
    }

    const result = results[0];
    let content = '';

    // Stats
    content += chalk.green(`+${result.additions} `) + chalk.red(`-${result.deletions}`) + '\n\n';

    // File paths
    content += chalk.red(`--- ${result.oldPath}`) + '\n';
    content += chalk.green(`+++ ${result.newPath}`) + '\n\n';

    // Diff blocks
    let contextCount = 0;
    const maxContext = 3;

    result.blocks.forEach((block, index) => {
      if (block.type === 'context') {
        if (contextCount < maxContext) {
          content += chalk.gray(` ${block.content}`) + '\n';
          contextCount++;
        } else if (contextCount === maxContext) {
          content += chalk.gray(' ...') + '\n';
          contextCount++;
        }
      } else if (block.type === 'add') {
        content += chalk.green(`+${block.content}`) + '\n';
        contextCount = 0;
      } else if (block.type === 'remove') {
        content += chalk.red(`-${block.content}`) + '\n';
        contextCount = 0;
      }
    });

    return this.engine.renderBox(content, {
      title: `Changes: ${result.additions} additions, ${result.deletions} deletions`,
      width: 80,
      color: result.deletions > 0 ? 'red' : 'green'
    });
  }

  renderSideBySide(oldContent: string, newContent: string): string {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    const maxLen = Math.max(oldLines.length, newLines.length);
    const colWidth = 35;
    
    let content = '';
    
    content += chalk.red('OLD'.padEnd(colWidth)) + ' │ ' + chalk.green('NEW'.padEnd(colWidth)) + '\n';
    content += chalk.gray('─'.repeat(colWidth) + '─┼─' + '─'.repeat(colWidth)) + '\n';

    for (let i = 0; i < Math.min(maxLen, 20); i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      
      const oldStr = oldLine.slice(0, colWidth).padEnd(colWidth);
      const newStr = newLine.slice(0, colWidth).padEnd(colWidth);
      
      if (oldLine === newLine) {
        content += chalk.gray(oldStr) + ' │ ' + chalk.gray(newStr) + '\n';
      } else {
        content += chalk.red(oldStr) + ' │ ' + chalk.green(newStr) + '\n';
      }
    }

    if (maxLen > 20) {
      content += chalk.gray('... (' + (maxLen - 20) + ' more lines) ...') + '\n';
    }

    return this.engine.renderBox(content, {
      title: 'Side-by-Side Diff',
      width: 80,
      color: 'yellow'
    });
  }

  update(data: any): void {
    // Trigger re-render
  }
}
