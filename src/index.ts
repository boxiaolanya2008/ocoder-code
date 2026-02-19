#!/usr/bin/env node
import { program } from 'commander';
import { runInteractive, runPrompt } from './repl';
import { loadConfig } from './config';
import { checkFirstTimeSetup, runFirstTimeSetup, runConfigMenu } from './ui/setup';

program
  .name('ocoder-code')
  .description('AI coding assistant CLI tool')
  .version('1.0.0')
  .option('-p, --prompt <text>', 'Run in prompt mode (non-interactive)')
  .option('-c, --continue', 'Continue the most recent session')
  .option('-r, --resume <session-id>', 'Resume a specific session')
  .option('-m, --model <model>', 'Specify model (default: deepseek-chat)')
  .option('--add-dir <path>', 'Add additional directory to context')
  .option('--output-format <format>', 'Output format: text, json, stream-json')
  .option('--teleport', 'Enable remote execution')
  .option('--agent', 'Enable agent mode (default)')
  .option('--no-agent', 'Disable agent mode')
  .option('--session-id <id>', 'Custom session ID')
  .option('--config', 'Open configuration menu')
  .option('--setup', 'Run first-time setup')
  .parse(process.argv);

const opts = program.opts();

async function main() {
  if (opts.setup) {
    await runFirstTimeSetup();
    return;
  }

  if (opts.config) {
    await runConfigMenu();
    return;
  }

  const isFirstTime = await checkFirstTimeSetup();
  if (isFirstTime) {
    await runFirstTimeSetup();
  }

  const config = await loadConfig();

  if (!config.apiKey) {
    console.log('\nNo API key configured. Please run: ocoder-code --setup\n');
    process.exit(1);
  }

  const agentEnabled = opts.agent !== false && config.agentEnabled !== false;

  if (opts.prompt) {
    await runPrompt(opts.prompt, {
      model: opts.model || config.model || 'deepseek-chat',
      outputFormat: opts.outputFormat || 'text',
      addDir: opts.addDir,
      agent: agentEnabled,
    });
  } else if (opts.continue || opts.resume) {
    await runInteractive({
      resumeSessionId: opts.resume,
      model: opts.model || config.model || 'deepseek-chat',
      addDir: opts.addDir,
      agent: agentEnabled,
    });
  } else {
    await runInteractive({
      model: opts.model || config.model || 'deepseek-chat',
      addDir: opts.addDir,
      agent: agentEnabled,
    });
  }
}

main().catch(console.error);
