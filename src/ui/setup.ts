import * as readline from 'readline';
import chalk from 'chalk';
import { loadConfig, saveConfig, getConfigDir } from '../config';
import * as fs from 'fs';
import { boxTitle, boxEnd, boxContent, printBox, printBoxed, printHeader, printDivider, printSubHeader } from './box';

const CONFIG_FILE = 'settings.json';

export async function checkFirstTimeSetup(): Promise<boolean> {
  const configDir = getConfigDir();
  const configPath = `${configDir}/${CONFIG_FILE}`;
  
  if (!fs.existsSync(configPath)) {
    return true;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (!config.apiKey) {
      return true;
    }
  } catch (e) {
    return true;
  }
  
  return false;
}

export async function runFirstTimeSetup(): Promise<void> {
  console.clear();
  
  printHeader('ocoder-code Setup');
  
  console.log(chalk.gray('Welcome to ocoder-code! Let\'s set up your environment.\n'));
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const question = (prompt: string): Promise<string> => {
    return new Promise(resolve => rl.question(prompt, resolve));
  };
  
  console.log(chalk.cyan.bold('\n--- Step 1: API Key ---'));
  console.log(chalk.gray('You need an API key to use the AI models.\n'));
  console.log(chalk.gray('Get your API key from: https://platform.deepseek.com'));
  
  let apiKey = await question(chalk.green('\nEnter your DeepSeek API Key: '));
  
  while (!apiKey.trim()) {
    console.log(chalk.yellow('API key is required. Please enter a valid key.'));
    apiKey = await question(chalk.green('Enter your DeepSeek API Key: '));
  }
  
  console.log(chalk.cyan.bold('\n--- Step 2: Select Model ---'));
  console.log(chalk.gray('Choose a model to use:\n'));
  console.log('  1. deepseek-chat    (Default, good for general tasks)');
  console.log('  2. deepseek-coder   (Specialized for coding)');
  console.log('  3. qwen            (Alibaba Qwen)');
  console.log('  4. glm             (Zhipu GLM)');
  console.log('  5. moonshot        (Moonshot)');
  
  let modelChoice = await question(chalk.green('\nSelect model (1-5, default: 1): '));
  const modelMap: Record<string, string> = {
    '1': 'deepseek-chat',
    '2': 'deepseek-coder',
    '3': 'qwen',
    '4': 'glm',
    '5': 'moonshot',
  };
  const model = modelMap[modelChoice] || 'deepseek-chat';
  
  console.log(chalk.cyan.bold('\n--- Step 3: Configure Permissions ---'));
  console.log(chalk.gray('Set up tool permissions (comma separated):\n'));
  console.log(chalk.gray('Current allow: Read, Glob, Grep, Bash(npm run:*), Bash(git:*)'));
  console.log(chalk.gray('Current deny:  Read(.env*), Bash(rm -rf:*)\n'));
  
  const customizePerms = await question(chalk.green('Customize permissions? (y/n, default: n): '));
  
  let permissions = {
    allow: ['Read', 'Glob', 'Grep', 'Bash(npm run:*)', 'Bash(git:*)', 'Edit(src/**)', 'Write(src/**)'],
    deny: ['Read(.env*)', 'Bash(rm -rf:*)'],
    ask: ['WebFetch', 'Bash(docker:*)'],
  };
  
  if (customizePerms.toLowerCase() === 'y') {
    const allowStr = await question(chalk.green('Allow (comma separated): '));
    const denyStr = await question(chalk.green('Deny (comma separated): '));
    const askStr = await question(chalk.green('Ask (comma separated): '));
    
    if (allowStr.trim()) permissions.allow = allowStr.split(',').map(s => s.trim());
    if (denyStr.trim()) permissions.deny = denyStr.split(',').map(s => s.trim());
    if (askStr.trim()) permissions.ask = askStr.split(',').map(s => s.trim());
  }
  
  console.log(chalk.cyan.bold('\n--- Step 4: Agent Mode ---'));
  console.log(chalk.gray('Agent mode allows the AI to use tools automatically.\n'));
  
  const agentMode = await question(chalk.green('Enable agent mode? (y/n, default: y): '));
  const enableAgent = agentMode.toLowerCase() !== 'n';
  
  const config = {
    model,
    apiBase: 'https://api.deepseek.com/v1',
    apiKey: apiKey.trim(),
    permissions,
    env: {},
    hooks: {},
    sandbox: { enabled: false },
    outputStyle: 'Explanatory',
    agentEnabled: enableAgent,
  };
  
  await saveConfig(config);
  
  console.clear();
  
  printHeader('Setup Complete!');
  
  console.log(chalk.green('\n  Configuration saved successfully!\n'));
  console.log(chalk.gray('  Config location: ') + getConfigDir() + '/settings.json');
  console.log(chalk.gray('  Model: ') + model);
  console.log(chalk.gray('  Agent mode: ') + (enableAgent ? chalk.green('enabled') : chalk.red('disabled')));
  console.log(chalk.gray('  Permissions: ') + permissions.allow.length + ' allow, ' + permissions.deny.length + ' deny\n');
  
  printDivider();
  console.log(chalk.cyan.bold('\n  You can now start using ocoder-code!\n'));
  console.log(chalk.gray('  Run: ') + chalk.white('ocoder-code') + chalk.gray(' or ') + chalk.white('ocoder-code -p "your prompt"'));
  printDivider();
  
  rl.close();
  
  await new Promise(resolve => setTimeout(resolve, 2000));
}

export async function runConfigMenu(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const question = (prompt: string): Promise<string> => {
    return new Promise(resolve => rl.question(prompt, resolve));
  };
  
  while (true) {
    console.clear();
    printHeader('ocoder-code Configuration');
    
    const config = await loadConfig();
    
    console.log(chalk.cyan.bold('\n  Current Settings:\n'));
    console.log(chalk.gray('  Model:     ') + config.model);
    console.log(chalk.gray('  API Base:  ') + config.apiBase);
    console.log(chalk.gray('  API Key:   ') + (config.apiKey ? config.apiKey.substring(0, 10) + '...' : '(not set)'));
    console.log(chalk.gray('  Agent:     ') + (config.agentEnabled !== false ? chalk.green('enabled') : chalk.red('disabled')));
    
    console.log(chalk.cyan.bold('\n  Options:\n'));
    console.log('  1. Change API Key');
    console.log('  2. Change Model');
    console.log('  3. Toggle Agent Mode');
    console.log('  4. View Permissions');
    console.log('  5. Reset to Defaults');
    console.log('  0. Exit\n');
    
    const choice = await question(chalk.green('Select: '));
    
    switch (choice) {
      case '1': {
        const newKey = await question(chalk.green('Enter new API Key: '));
        if (newKey.trim()) {
          await saveConfig({ apiKey: newKey.trim() });
          console.log(chalk.green('\nAPI Key updated!\n'));
        }
        break;
      }
      case '2': {
        console.log('\n  1. deepseek-chat');
        console.log('  2. deepseek-coder');
        console.log('  3. qwen');
        console.log('  4. glm');
        console.log('  5. moonshot');
        const modelChoice = await question(chalk.green('Select model: '));
        const modelMap: Record<string, string> = {
          '1': 'deepseek-chat',
          '2': 'deepseek-coder',
          '3': 'qwen',
          '4': 'glm',
          '5': 'moonshot',
        };
        if (modelMap[modelChoice]) {
          await saveConfig({ model: modelMap[modelChoice] });
          console.log(chalk.green('\nModel updated!\n'));
        }
        break;
      }
      case '3': {
        const newMode = config.agentEnabled !== false ? false : true;
        await saveConfig({ agentEnabled: newMode });
        console.log(chalk.green('\nAgent mode ' + (newMode ? 'enabled' : 'disabled') + '!\n'));
        break;
      }
      case '4': {
        console.log(chalk.cyan('\n  Allow: ') + config.permissions.allow.join(', '));
        console.log(chalk.red('  Deny:  ') + config.permissions.deny.join(', '));
        console.log(chalk.yellow('  Ask:   ') + config.permissions.ask.join(', '));
        await question(chalk.gray('\nPress Enter to continue...'));
        break;
      }
      case '5': {
        const confirm = await question(chalk.red('Reset all settings? (y/n): '));
        if (confirm.toLowerCase() === 'y') {
          await saveConfig({
            model: 'deepseek-chat',
            apiBase: 'https://api.deepseek.com/v1',
            apiKey: '',
            agentEnabled: true,
          });
          console.log(chalk.green('\nSettings reset!\n'));
        }
        break;
      }
      case '0':
        rl.close();
        return;
      default:
        console.log(chalk.yellow('\nInvalid option.\n'));
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
