import chalk from 'chalk';

interface Session {
  id: string;
  messages: any[];
  model: string;
  createdAt: string;
  updatedAt: string;
}

export function showStatus(session: Session | null): void {
  console.log(chalk.cyan('\n=== ocoder-code Status ===\n'));

  console.log(chalk.white('Session:'));
  if (session) {
    console.log(`  ID: ${session.id}`);
    console.log(`  Model: ${session.model}`);
    console.log(`  Messages: ${session.messages.length}`);
    console.log(`  Created: ${new Date(session.createdAt).toLocaleString()}`);
  } else {
    console.log('  No active session');
  }

  console.log(chalk.white('\nToken Usage:'));
  console.log('  (Token tracking not yet implemented)');

  console.log(chalk.white('\nCost:'));
  console.log('  (Cost tracking not yet implemented)');

  console.log(chalk.white('\nRuntime:'));
  if (session) {
    const runtime = Date.now() - new Date(session.createdAt).getTime();
    const minutes = Math.floor(runtime / 60000);
    const seconds = Math.floor((runtime % 60000) / 1000);
    console.log(`  ${minutes}m ${seconds}s`);
  } else {
    console.log('  0m 0s');
  }

  console.log(chalk.white('\nConfiguration:'));
  console.log('  Model: deepseek-chat (default)');
  console.log('  API: https://api.deepseek.com/v1');
  console.log('  Agent Mode: enabled');

  console.log('');
}
