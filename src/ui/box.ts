import chalk from 'chalk';
import * as os from 'os';

const TERMINAL_WIDTH = Math.min(process.stdout.columns || 80, 100);

function createBox(title?: string): { top: string; bottom: string; side: string } {
  const width = TERMINAL_WIDTH;
  const top = title
    ? '┌' + '─'.repeat(Math.floor((width - title.length - 2) / 2)) + ' ' + title + ' ' + '─'.repeat(width - Math.floor((width - title.length - 2) / 2) - title.length - 3) + '┐'
    : '┌' + '─'.repeat(width - 2) + '┐';
  const bottom = '└' + '─'.repeat(width - 2) + '┘';
  const side = '│';
  return { top, bottom, side };
}

export function boxTitle(text: string): string {
  const { top, bottom, side } = createBox(text);
  return chalk.cyan(top);
}

export function boxEnd(): string {
  const { bottom } = createBox();
  return chalk.cyan(bottom);
}

export function boxLine(text: string): string {
  const { side } = createBox();
  const width = TERMINAL_WIDTH - 2;
  const padding = width - text.length;
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return chalk.cyan(side) + ' '.repeat(leftPad) + text + ' '.repeat(rightPad) + chalk.cyan(side);
}

export function boxContent(lines: string[]): string[] {
  const { side } = createBox();
  const width = TERMINAL_WIDTH - 2;
  
  return lines.map(line => {
    if (line.startsWith('  ') || line.startsWith(chalk.gray('* ')) || line.startsWith(chalk.gray('o ')) || line.startsWith(chalk.gray('x '))) {
      return chalk.cyan(side) + line;
    }
    
    const padding = Math.max(0, width - line.length);
    return chalk.cyan(side) + line + ' '.repeat(padding) + chalk.cyan(side);
  });
}

export function boxWrap(content: string): string {
  const { top, bottom, side } = createBox();
  const width = TERMINAL_WIDTH - 2;
  
  const lines = content.split('\n');
  const wrappedLines: string[] = [];
  
  for (const line of lines) {
    if (line.length <= width) {
      wrappedLines.push(line);
    } else {
      let remaining = line;
      while (remaining.length > width) {
        wrappedLines.push(remaining.slice(0, width));
        remaining = remaining.slice(width);
      }
      if (remaining) wrappedLines.push(remaining);
    }
  }
  
  const contentLines = wrappedLines.map(line => {
    const padding = width - line.length;
    return chalk.cyan(side) + line + ' '.repeat(Math.max(0, padding)) + chalk.cyan(side);
  });
  
  return [top, ...contentLines, bottom].join('\n');
}

export function printBox(title: string, content: string | string[]): void {
  const { top, bottom, side } = createBox(title);
  const width = TERMINAL_WIDTH - 2;
  
  console.log(chalk.cyan(top));
  
  const lines = Array.isArray(content) ? content : content.split('\n');
  for (const line of lines) {
    const padding = width - stripAnsi(line).length;
    console.log(chalk.cyan(side) + line + ' '.repeat(Math.max(0, padding)) + chalk.cyan(side));
  }
  
  console.log(chalk.cyan(bottom));
}

export function printBoxed(title: string, lines: string[]): void {
  const { top, bottom, side } = createBox(title);
  const width = TERMINAL_WIDTH - 2;
  
  console.log(top);
  
  for (const line of lines) {
    const padding = width - stripAnsi(line).length;
    console.log(side + line + ' '.repeat(Math.max(0, padding)) + side);
  }
  
  console.log(bottom);
}

export function printHeader(title: string): void {
  const width = TERMINAL_WIDTH;
  const padding = Math.floor((width - title.length - 2) / 2);
  const line = ' '.repeat(padding) + title + ' '.repeat(width - padding - title.length - 2);
  console.log(chalk.cyan.bold('\n' + line));
  console.log(chalk.cyan('─'.repeat(width) + '\n'));
}

export function printDivider(): void {
  console.log(chalk.cyan('─'.repeat(TERMINAL_WIDTH)));
}

export function printSubHeader(text: string): void {
  console.log(chalk.cyan.bold('\n  ' + text));
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export function centerText(text: string, width: number = TERMINAL_WIDTH): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

export function padRight(text: string, width: number = TERMINAL_WIDTH - 4): string {
  const padding = Math.max(0, width - stripAnsi(text).length);
  return text + ' '.repeat(padding);
}

export const ui = {
  box: {
    title: boxTitle,
    end: boxEnd,
    line: boxLine,
    content: boxContent,
    wrap: boxWrap,
    print: printBox,
    printBoxed,
  },
  header: printHeader,
  divider: printDivider,
  subHeader: printSubHeader,
  center: centerText,
  padRight,
  width: TERMINAL_WIDTH,
};
