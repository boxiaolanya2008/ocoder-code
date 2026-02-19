import UIComponent from './components';
import chalk from 'chalk';
import ora from 'ora';

export function showWelcome(model: string, sessionId: string): void {
  UIComponent.header('OCODER-CODE CLI', 60);
  
  UIComponent.keyValuePairs([
    { key: 'Version', value: '1.0.0' },
    { key: 'Model', value: model },
    { key: 'Session', value: sessionId },
  ]);
  
  UIComponent.info('Type /help for available commands');
  console.log();
}

export function showHelp(): void {
  UIComponent.header('COMMANDS', 60);
  
  const commands = [
    ['/help', 'Show available commands'],
    ['/init', 'Initialize project OCODER.md'],
    ['/clear', 'Clear conversation history'],
    ['/status', 'Show current session status'],
    ['/sessions', 'List all sessions'],
    ['/load <id>', 'Load a specific session'],
    ['/save', 'Save current session'],
    ['/delete <id>', 'Delete a session'],
    ['/config', 'Open configuration menu'],
    ['/exit', 'Exit the application']
  ];

  UIComponent.table(['Command', 'Description'], commands);
}

export function showStatus(session: any): void {
  UIComponent.header('SESSION STATUS', 60);
  
  const messages = session.messages || [];
  const userMessages = messages.filter((m: any) => m.role === 'user').length;
  const assistantMessages = messages.filter((m: any) => m.role === 'assistant').length;
  
  UIComponent.keyValuePairs([
    { key: 'Session ID', value: session.id },
    { key: 'Messages', value: `${userMessages} user, ${assistantMessages} assistant` },
    { key: 'Created', value: new Date(session.created_at).toLocaleString() },
    { key: 'Last Updated', value: new Date(session.updated_at).toLocaleString() }
  ]);
}

export function showSessions(sessions: any[]): void {
  UIComponent.header('SESSIONS', 80);
  
  if (sessions.length === 0) {
    UIComponent.warning('No sessions found');
    return;
  }
  
  const sessionData = sessions.map(session => [
    session.id,
    new Date(session.created_at).toLocaleDateString(),
    `${session.messages?.length || 0} messages`,
    session.messages?.[0]?.content?.substring(0, 50) + '...' || 'Empty'
  ]);
  
  UIComponent.table(['ID', 'Created', 'Messages', 'Last Message'], sessionData);
}

export function showToolExecution(toolName: string): void {
  UIComponent.toolCall(toolName, 'start');
}

export function showToolResult(toolName: string, output: string, isError: boolean = false): void {
  if (isError) {
    UIComponent.toolCall(toolName, 'error');
    console.log(chalk.red(`  Error: ${output}`));
  } else {
    UIComponent.toolCall(toolName, 'success');
    const truncatedOutput = output.length > 200 ? output.substring(0, 200) + '...' : output;
    console.log(chalk.gray(`  Result: ${truncatedOutput}`));
  }
}

export function showTaskProgress(task: any): void {
  UIComponent.header('TASK PROGRESS', 60);
  
  const completed = task.todos?.filter((t: any) => t.status === 'done').length || 0;
  const total = task.todos?.length || 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  UIComponent.progressBar(completed, total, 'Progress');
  
  console.log();
  UIComponent.keyValuePairs([
    { key: 'Task', value: task.title },
    { key: 'Status', value: task.status },
    { key: 'Progress', value: `${completed}/${total} (${progress}%)` }
  ]);
  
  if (task.todos && task.todos.length > 0) {
    UIComponent.section('Todos');
    task.todos.forEach((todo: any) => {
      const status = todo.status === 'done' ? '✓' : 
                   todo.status === 'in_progress' ? '⚡' : 
                   todo.status === 'blocked' ? '✗' : '○';
      const auto = todo.auto_execute ? ' [auto]' : '';
      console.log(chalk.gray(`  ${status} ${todo.content}${auto}`));
    });
    UIComponent.sectionEnd();
  }
}

export function showUserPrompt(): void {
  console.log();
  console.log(chalk.cyan('❯'));
}

export function showAssistantMessage(content: string): void {
  console.log();
  UIComponent.section('Assistant');
  console.log(content);
  UIComponent.sectionEnd();
}

export function showErrorMessage(message: string): void {
  console.log();
  UIComponent.error(message);
  console.log();
}

export function showInfoMessage(message: string): void {
  console.log();
  UIComponent.info(message);
  console.log();
}

export function showSuccessMessage(message: string): void {
  console.log();
  UIComponent.success(message);
  console.log();
}
