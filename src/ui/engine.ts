import chalk from 'chalk';

export interface BoxOptions {
  width?: number;
  height?: number;
  padding?: number;
  border?: boolean;
  borderStyle?: 'single' | 'double' | 'round' | 'bold';
  title?: string;
  color?: string;
}

export interface LayoutGrid {
  rows: number;
  cols: number;
  cells: LayoutCell[];
}

export interface LayoutCell {
  row: number;
  col: number;
  rowSpan?: number;
  colSpan?: number;
  component: string;
}

export class RenderingEngine {
  private static instance: RenderingEngine;
  private components: Map<string, UIComponent> = new Map();
  private layout: LayoutGrid | null = null;
  private screenBuffer: string[][] = [];

  static getInstance(): RenderingEngine {
    if (!RenderingEngine.instance) {
      RenderingEngine.instance = new RenderingEngine();
    }
    return RenderingEngine.instance;
  }

  registerComponent(name: string, component: UIComponent): void {
    this.components.set(name, component);
  }

  setLayout(layout: LayoutGrid): void {
    this.layout = layout;
    this.initScreenBuffer();
  }

  private initScreenBuffer(): void {
    const terminalWidth = process.stdout.columns || 80;
    const terminalHeight = process.stdout.rows || 24;
    
    this.screenBuffer = Array(terminalHeight)
      .fill(null)
      .map(() => Array(terminalWidth).fill(' '));
  }

  render(): void {
    if (!this.layout) return;

    console.clear();
    
    this.layout.cells.forEach(cell => {
      const component = this.components.get(cell.component);
      if (component) {
        const rendered = component.render();
        this.drawToBuffer(cell, rendered);
      }
    });

    console.log(this.bufferToString());
  }

  private drawToBuffer(cell: LayoutCell, content: string): void {
    const lines = content.split('\n');
    let currentRow = cell.row;
    
    lines.forEach(line => {
      if (currentRow < this.screenBuffer.length) {
        const startCol = cell.col;
        const endCol = Math.min(startCol + line.length, this.screenBuffer[0].length);
        
        for (let i = startCol; i < endCol; i++) {
          this.screenBuffer[currentRow][i] = line[i - startCol];
        }
      }
      currentRow++;
    });
  }

  private bufferToString(): string {
    return this.screenBuffer.map(row => row.join('')).join('\n');
  }

  renderBox(content: string, options: BoxOptions = {}): string {
    const {
      width = 60,
      padding = 1,
      border = true,
      borderStyle = 'single',
      title,
      color = 'cyan'
    } = options;

    const lines = content.split('\n');
    const contentWidth = width - 2 * padding - (border ? 2 : 0);
    
    const wrappedLines = lines.flatMap(line => {
      if (line.length <= contentWidth) return [line];
      const chunks: string[] = [];
      for (let i = 0; i < line.length; i += contentWidth) {
        chunks.push(line.slice(i, i + contentWidth));
      }
      return chunks;
    });

    const borders = {
      single: { h: '─', v: '│', tl: '┌', tr: '┐', bl: '└', br: '┘' },
      double: { h: '═', v: '║', tl: '╔', tr: '╗', bl: '╚', br: '╝' },
      round: { h: '─', v: '│', tl: '╭', tr: '╮', bl: '╰', br: '╯' },
      bold: { h: '━', v: '┃', tl: '┏', tr: '┓', bl: '┗', br: '┛' }
    };

    const b = borders[borderStyle];
    const colorFn = (chalk as any)[color] || chalk.cyan;

    let result = '';

    // Top border with title
    if (border) {
      let topBorder = b.tl + b.h.repeat(width - 2) + b.tr;
      if (title) {
        const titleLen = title.length;
        const start = Math.floor((width - 2 - titleLen) / 2);
        topBorder = b.tl + b.h.repeat(start) + title + b.h.repeat(width - 2 - start - titleLen) + b.tr;
      }
      result += colorFn(topBorder) + '\n';
    }

    // Content with padding
    wrappedLines.forEach(line => {
      const padded = ' '.repeat(padding) + line.padEnd(contentWidth) + ' '.repeat(padding);
      if (border) {
        result += colorFn(b.v) + padded + colorFn(b.v) + '\n';
      } else {
        result += padded + '\n';
      }
    });

    // Bottom border
    if (border) {
      result += colorFn(b.bl + b.h.repeat(width - 2) + b.br);
    }

    return result;
  }

  renderPanel(title: string, content: string, width: number = 60): string {
    return this.renderBox(content, { title, width, borderStyle: 'single' });
  }

  renderGrid(items: string[], cols: number = 3, width: number = 20): string {
    const result: string[] = [];
    
    for (let i = 0; i < items.length; i += cols) {
      const row = items.slice(i, i + cols);
      result.push(row.map(item => item.padEnd(width)).join(' │ '));
    }

    return result.join('\n');
  }

  renderProgressBar(percent: number, width: number = 40): string {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${chalk.cyan(bar)}] ${percent}%`;
  }
}

export abstract class UIComponent {
  protected engine: RenderingEngine;

  constructor() {
    this.engine = RenderingEngine.getInstance();
  }

  abstract render(): string;
  abstract update(data: any): void;
}

export default RenderingEngine;
