import { Completer } from 'readline';

const COMMANDS = [
  '/help',
  '/init',
  '/clear',
  '/compact',
  '/config',
  '/resume',
  '/status',
  '/exit',
];

export function createCompleter(): Completer {
  return function(line: string): [string[], string] {
    if (!line.startsWith('/')) {
      return [[], line];
    }

    const hits = COMMANDS.filter(cmd => cmd.startsWith(line));

    if (hits.length === 0) {
      return [[], line];
    }

    return [hits, line];
  };
}

export function showCommandList(): void {
  console.log('\nAvailable commands:');
  COMMANDS.forEach(cmd => console.log(`  ${cmd}`));
  console.log('');
}
