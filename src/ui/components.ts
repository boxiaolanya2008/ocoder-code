import chalk from 'chalk';
import ora from 'ora';

export class UIComponent {
  static header(title: string, width: number = 80): void {
    const line = '═'.repeat(width);
    const padding = Math.max(0, width - title.length - 4);
    const titleWithPadding = `║ ${title}${' '.repeat(padding)} ║`;
    
    console.log(chalk.cyan(`╔${line.substring(2)}╗`));
    console.log(chalk.cyan(titleWithPadding));
    console.log(chalk.cyan(`╚${line.substring(2)}╝`));
    console.log();
  }

  static section(title: string): void {
    console.log();
    console.log(chalk.magenta(`┌─ ${title}`));
    console.log(chalk.magenta('│'));
  }

  static sectionEnd(): void {
    console.log(chalk.magenta('└─'));
    console.log();
  }

  static success(message: string): void {
    console.log(chalk.green(`✓ ${message}`));
  }

  static error(message: string): void {
    console.log(chalk.red(`✗ ${message}`));
  }

  static warning(message: string): void {
    console.log(chalk.yellow(`⚠ ${message}`));
  }

  static info(message: string): void {
    console.log(chalk.blue(`ℹ ${message}`));
  }

  static toolCall(toolName: string, status: 'start' | 'success' | 'error'): void {
    switch (status) {
      case 'start':
        console.log(chalk.gray(`⚡ ${toolName}...`));
        break;
      case 'success':
        console.log(chalk.green(`✓ ${toolName} completed`));
        break;
      case 'error':
        console.log(chalk.red(`✗ ${toolName} failed`));
        break;
    }
  }

  static progressBar(current: number, total: number, label: string = 'Progress'): void {
    const percentage = Math.round((current / total) * 100);
    const barLength = 30;
    const filledLength = Math.round((current / total) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    
    console.log(`${label}: [${chalk.cyan(bar)}] ${percentage}% (${current}/${total})`);
  }

  static table(headers: string[], rows: string[][]): void {
    if (rows.length === 0) return;

    const columnWidths = headers.map((header, i) => {
      const maxWidth = Math.max(
        header.length,
        ...rows.map(row => (row[i] || '').length)
      );
      return maxWidth;
    });

    const separator = columnWidths.map(width => '─'.repeat(width + 2)).join('┼');
    
    console.log(chalk.cyan('┌' + separator + '┐'));
    
    console.log(chalk.cyan('│') + headers.map((header, i) => {
      const padding = columnWidths[i] - header.length;
      return ` ${header}${' '.repeat(padding)} `;
    }).join(chalk.cyan('│')) + chalk.cyan('│'));
    
    console.log(chalk.cyan('├' + separator + '┤'));
    
    rows.forEach(row => {
      console.log(chalk.gray('│') + row.map((cell, i) => {
        const padding = columnWidths[i] - (cell || '').length;
        return ` ${cell || ''}${' '.repeat(padding)} `;
      }).join(chalk.gray('│')) + chalk.gray('│'));
    });
    
    console.log(chalk.cyan('└' + separator + '┘'));
    console.log();
  }

  static keyValuePairs(pairs: { key: string; value: string }[]): void {
    const maxKeyLength = Math.max(...pairs.map(p => p.key.length));
    
    pairs.forEach(pair => {
      const padding = maxKeyLength - pair.key.length;
      console.log(chalk.cyan(pair.key + ':') + ' '.repeat(padding + 1) + chalk.white(pair.value));
    });
    console.log();
  }

  static codeBlock(content: string, language?: string): void {
    console.log(chalk.gray('┌─ Code' + (language ? ` (${language})` : '')));
    console.log(chalk.gray('│'));
    
    const lines = content.split('\n');
    lines.forEach(line => {
      console.log(chalk.gray(`│ ${line}`));
    });
    
    console.log(chalk.gray('└─'));
    console.log();
  }

  static spinner(text: string): any {
    return ora({
      text: text,
      color: 'cyan',
      spinner: 'dots'
    });
  }

  static divider(char: string = '─', width: number = 80): void {
    console.log(chalk.gray(char.repeat(width)));
  }

  static indent(text: string, spaces: number = 2): string {
    return ' '.repeat(spaces) + text;
  }

  static highlight(text: string, color: 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' = 'yellow'): string {
    return chalk[color](text);
  }
}

export default UIComponent;
