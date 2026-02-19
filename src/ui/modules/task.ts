import { UIComponent, RenderingEngine } from '../engine';
import chalk from 'chalk';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  logs: string[];
}

export class TaskModule {
  private tasks: Map<string, Task> = new Map();
  private currentTask: string | null = null;

  createTask(title: string, description?: string): string {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task: Task = {
      id,
      title,
      description,
      status: 'pending',
      progress: 0,
      logs: []
    };
    this.tasks.set(id, task);
    return id;
  }

  updateTask(id: string, updates: Partial<Task>): void {
    const task = this.tasks.get(id);
    if (task) {
      Object.assign(task, updates);
    }
  }

  addLog(id: string, message: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.logs.push(`[${new Date().toLocaleTimeString()}] ${message}`);
    }
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  setCurrentTask(id: string): void {
    this.currentTask = id;
  }

  getCurrentTask(): Task | undefined {
    return this.currentTask ? this.tasks.get(this.currentTask) : undefined;
  }
}

export class TaskUI extends UIComponent {
  private taskModule: TaskModule;

  constructor(taskModule: TaskModule) {
    super();
    this.taskModule = taskModule;
  }

  render(): string {
    const currentTask = this.taskModule.getCurrentTask();
    if (!currentTask) {
      return this.engine.renderBox('No active task', {
        title: 'Task Status',
        width: 60,
        borderStyle: 'single',
        color: 'gray'
      });
    }

    const statusIcon = this.getStatusIcon(currentTask.status);
    const statusColor = this.getStatusColor(currentTask.status);
    
    let content = '';
    content += `${statusIcon} ${chalk.bold(currentTask.title)}\n`;
    content += chalk.gray(`Status: ${statusColor(currentTask.status.toUpperCase())}\n`);
    content += chalk.gray(`Progress: ${this.engine.renderProgressBar(currentTask.progress)}\n`);
    
    if (currentTask.description) {
      content += chalk.gray(`\n${currentTask.description}\n`);
    }

    if (currentTask.logs.length > 0) {
      content += chalk.gray('\nRecent logs:\n');
      currentTask.logs.slice(-5).forEach(log => {
        content += chalk.gray(`  ${log}\n`);
      });
    }

    return this.engine.renderBox(content, {
      title: 'Task Status',
      width: 60,
      borderStyle: currentTask.status === 'running' ? 'double' : 'single',
      color: currentTask.status === 'failed' ? 'red' : 'cyan'
    });
  }

  renderTaskList(): string {
    const tasks = this.taskModule.getAllTasks();
    
    if (tasks.length === 0) {
      return this.engine.renderBox('No tasks', {
        title: 'Tasks',
        width: 60,
        color: 'gray'
      });
    }

    const items = tasks.map(task => {
      const icon = this.getStatusIcon(task.status);
      const progress = `${task.progress}%`;
      return `${icon} ${task.title.padEnd(30)} ${progress}`;
    });

    return this.engine.renderBox(items.join('\n'), {
      title: `Tasks (${tasks.length})`,
      width: 60,
      color: 'cyan'
    });
  }

  update(data: any): void {
    // Trigger re-render
  }

  private getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: '○',
      running: '◐',
      completed: '●',
      failed: '◯'
    };
    return icons[status] || '○';
  }

  private getStatusColor(status: string): Function {
    const colors: Record<string, Function> = {
      pending: chalk.gray,
      running: chalk.yellow,
      completed: chalk.green,
      failed: chalk.red
    };
    return colors[status] || chalk.gray;
  }
}

