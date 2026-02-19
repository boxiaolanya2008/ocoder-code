import { UIComponent } from '../engine';
import chalk from 'chalk';

export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'done' | 'blocked' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dependsOn?: string[];
  createdAt: Date;
  completedAt?: Date;
  assignee?: string;
}

export class TodoModule {
  private todos: Map<string, TodoItem> = new Map();

  createTodo(content: string, priority: 'low' | 'medium' | 'high' = 'medium', dependsOn?: string[]): string {
    const id = `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const todo: TodoItem = {
      id,
      content,
      status: 'pending',
      priority,
      dependsOn,
      createdAt: new Date()
    };
    this.todos.set(id, todo);
    return id;
  }

  updateTodo(id: string, updates: Partial<TodoItem>): boolean {
    const todo = this.todos.get(id);
    if (!todo) return false;

    Object.assign(todo, updates);
    if (updates.status === 'done' && !todo.completedAt) {
      todo.completedAt = new Date();
    }
    return true;
  }

  deleteTodo(id: string): boolean {
    return this.todos.delete(id);
  }

  getTodo(id: string): TodoItem | undefined {
    return this.todos.get(id);
  }

  getAllTodos(): TodoItem[] {
    return Array.from(this.todos.values());
  }

  getTodosByStatus(status: TodoItem['status']): TodoItem[] {
    return this.getAllTodos().filter(t => t.status === status);
  }

  getNextPending(): TodoItem | undefined {
    return this.getAllTodos().find(t => {
      if (t.status !== 'pending') return false;
      if (t.dependsOn && t.dependsOn.length > 0) {
        return t.dependsOn.every(depId => {
          const dep = this.todos.get(depId);
          return dep?.status === 'done';
        });
      }
      return true;
    });
  }

  getStats(): { total: number; pending: number; inProgress: number; done: number; blocked: number } {
    const all = this.getAllTodos();
    return {
      total: all.length,
      pending: all.filter(t => t.status === 'pending').length,
      inProgress: all.filter(t => t.status === 'in_progress').length,
      done: all.filter(t => t.status === 'done').length,
      blocked: all.filter(t => t.status === 'blocked').length
    };
  }
}

export class TodoUI extends UIComponent {
  private todoModule: TodoModule;

  constructor(todoModule: TodoModule) {
    super();
    this.todoModule = todoModule;
  }

  render(): string {
    return this.renderTodoList();
  }

  renderTodoList(): string {
    const todos = this.todoModule.getAllTodos();
    const stats = this.todoModule.getStats();

    if (todos.length === 0) {
      return this.engine.renderBox('No todos', {
        title: 'Todo List',
        width: 70,
        color: 'gray'
      });
    }

    // Stats line
    let content = '';
    content += chalk.gray(`Total: ${stats.total}  `);
    content += chalk.yellow(`Pending: ${stats.pending}  `);
    content += chalk.blue(`In Progress: ${stats.inProgress}  `);
    content += chalk.green(`Done: ${stats.done}  `);
    content += chalk.red(`Blocked: ${stats.blocked}\n\n`);

    // Group by status
    const groups = {
      in_progress: todos.filter(t => t.status === 'in_progress'),
      pending: todos.filter(t => t.status === 'pending'),
      blocked: todos.filter(t => t.status === 'blocked'),
      done: todos.filter(t => t.status === 'done')
    };

    Object.entries(groups).forEach(([status, items]) => {
      if (items.length === 0) return;

      const statusColor = this.getStatusColor(status as TodoItem['status']);
      content += statusColor(`${this.getStatusIcon(status as TodoItem['status'])} ${status.toUpperCase()} (${items.length})`) + '\n';

      items.forEach(todo => {
        const priorityIcon = this.getPriorityIcon(todo.priority);
        const line = `  ${priorityIcon} ${todo.content}`;
        content += line + '\n';

        if (todo.dependsOn && todo.dependsOn.length > 0) {
          content += chalk.gray(`     ↳ depends on: ${todo.dependsOn.join(', ')}\n`);
        }
      });

      content += '\n';
    });

    return this.engine.renderBox(content, {
      title: `Todo List (${stats.done}/${stats.total})`,
      width: 70,
      color: 'magenta'
    });
  }

  renderKanban(): string {
    const todos = this.todoModule.getAllTodos();
    const colWidth = 20;

    const columns = {
      pending: todos.filter(t => t.status === 'pending'),
      in_progress: todos.filter(t => t.status === 'in_progress'),
      done: todos.filter(t => t.status === 'done')
    };

    let content = '';

    // Header
    content += chalk.yellow('TO DO'.padEnd(colWidth));
    content += ' │ ';
    content += chalk.blue('IN PROGRESS'.padEnd(colWidth));
    content += ' │ ';
    content += chalk.green('DONE'.padEnd(colWidth));
    content += '\n';
    content += chalk.gray('─'.repeat(colWidth) + '─┼─' + '─'.repeat(colWidth) + '─┼─' + '─'.repeat(colWidth));
    content += '\n';

    // Max rows
    const maxRows = Math.max(...Object.values(columns).map(c => c.length));

    for (let i = 0; i < Math.min(maxRows, 10); i++) {
      const pending = columns.pending[i];
      const inProgress = columns.in_progress[i];
      const done = columns.done[i];

      content += (pending ? pending.content.slice(0, colWidth) : '').padEnd(colWidth);
      content += ' │ ';
      content += (inProgress ? inProgress.content.slice(0, colWidth) : '').padEnd(colWidth);
      content += ' │ ';
      content += (done ? done.content.slice(0, colWidth) : '').padEnd(colWidth);
      content += '\n';
    }

    if (maxRows > 10) {
      content += chalk.gray('... (' + (maxRows - 10) + ' more) ...') + '\n';
    }

    return this.engine.renderBox(content, {
      title: 'Kanban Board',
      width: 70,
      color: 'magenta'
    });
  }

  update(data: any): void {
    // Trigger re-render
  }

  private getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: '○',
      in_progress: '◐',
      done: '●',
      blocked: '◯',
      cancelled: '⊘'
    };
    return icons[status] || '○';
  }

  private getStatusColor(status: string): Function {
    const colors: Record<string, Function> = {
      pending: chalk.yellow,
      in_progress: chalk.blue,
      done: chalk.green,
      blocked: chalk.red,
      cancelled: chalk.gray
    };
    return colors[status] || chalk.gray;
  }

  private getPriorityIcon(priority: string): string {
    const icons: Record<string, string> = {
      low: '↓',
      medium: '→',
      high: '↑'
    };
    return icons[priority] || '→';
  }
}
