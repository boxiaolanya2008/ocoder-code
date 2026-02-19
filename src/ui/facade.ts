import { RenderingEngine } from './engine';
import { TaskModule, TaskUI } from './modules/task';
import { FileModule, FileUI } from './modules/file';
import { DiffModule, DiffUI } from './modules/diff';
import { ChatModule, ChatUI } from './modules/chat';
import { TodoModule, TodoUI } from './modules/todo';
import { LogModule, LogUI } from './modules/log';
import { TokenStatsModule, TokenStatsUI } from './modules/tokenStats';

export class CLIFacade {
  private engine: RenderingEngine;
  
  // Modules
  public task: TaskModule;
  public file: FileModule;
  public diff: DiffModule;
  public chat: ChatModule;
  public todo: TodoModule;
  public log: LogModule;
  public tokenStats: TokenStatsModule;

  // UI Components
  public taskUI: TaskUI;
  public fileUI: FileUI;
  public diffUI: DiffUI;
  public chatUI: ChatUI;
  public todoUI: TodoUI;
  public logUI: LogUI;
  public tokenStatsUI: TokenStatsUI;

  private static instance: CLIFacade;

  static getInstance(): CLIFacade {
    if (!CLIFacade.instance) {
      CLIFacade.instance = new CLIFacade();
    }
    return CLIFacade.instance;
  }

  private constructor() {
    this.engine = RenderingEngine.getInstance();

    // Initialize modules
    this.task = new TaskModule();
    this.file = new FileModule();
    this.diff = new DiffModule();
    this.chat = new ChatModule();
    this.todo = new TodoModule();
    this.log = new LogModule();
    this.tokenStats = new TokenStatsModule();

    // Initialize UI components
    this.taskUI = new TaskUI(this.task);
    this.fileUI = new FileUI(this.file);
    this.diffUI = new DiffUI(this.diff);
    this.chatUI = new ChatUI(this.chat);
    this.todoUI = new TodoUI(this.todo);
    this.logUI = new LogUI(this.log);
    this.tokenStatsUI = new TokenStatsUI(this.tokenStats);

    // Register components with engine
    this.engine.registerComponent('task', this.taskUI);
    this.engine.registerComponent('file', this.fileUI);
    this.engine.registerComponent('diff', this.diffUI);
    this.engine.registerComponent('chat', this.chatUI);
    this.engine.registerComponent('todo', this.todoUI);
    this.engine.registerComponent('log', this.logUI);

    // Set up log listeners
    this.log.onLog((entry) => {
      // Auto-display important logs
      if (entry.level === 'error' || entry.level === 'success') {
        this.logUI.renderLiveLog(entry);
      }
    });
  }

  // Convenience methods
  showTask(taskId?: string): string {
    if (taskId) {
      this.task.setCurrentTask(taskId);
    }
    return this.taskUI.render();
  }

  showTasks(): string {
    return this.taskUI.renderTaskList();
  }

  showFile(filePath: string): Promise<string> {
    return this.fileUI.renderFileContent(filePath);
  }

  showFiles(dirPath: string): Promise<string> {
    return this.fileUI.renderFileList(dirPath);
  }

  showDiff(oldContent: string, newContent: string): string {
    const diffText = this.diff.generateDiff(oldContent, newContent);
    return this.diffUI.renderDiff(diffText);
  }

  showChat(): string {
    return this.chatUI.render();
  }

  showTodos(): string {
    return this.todoUI.render();
  }

  showKanban(): string {
    return this.todoUI.renderKanban();
  }

  showLogs(): string {
    return this.logUI.render();
  }

  showTokenStats(): string {
    return this.tokenStatsUI.render();
  }

  // Quick operations
  recordTokenUsage(promptTokens: number, completionTokens: number, model: string, operation?: string): void {
    this.tokenStats.recordUsage(promptTokens, completionTokens, model, operation);
  }
  async createFile(path: string, content: string): Promise<void> {
    await this.file.writeFile(path, content);
    this.log.success(`Created file: ${path}`, 'File');
  }

  createTask(title: string, description?: string): string {
    const id = this.task.createTask(title, description);
    this.log.info(`Created task: ${title}`, 'Task');
    return id;
  }

  createTodo(content: string, priority?: 'low' | 'medium' | 'high'): string {
    const id = this.todo.createTodo(content, priority);
    this.log.info(`Created todo: ${content}`, 'Todo');
    return id;
  }

  // Dashboard
  renderDashboard(): string {
    const sections: string[] = [];
    
    // Header
    sections.push(this.engine.renderBox('OCODER-CODE CLI Dashboard', {
      title: 'Dashboard',
      width: 100,
      borderStyle: 'double',
      color: 'cyan'
    }));

    // Task status
    const currentTask = this.task.getCurrentTask();
    if (currentTask) {
      sections.push(this.taskUI.render());
    }

    // Recent todos
    const todos = this.todo.getAllTodos();
    if (todos.length > 0) {
      sections.push(this.todoUI.render());
    }

    // Recent logs
    sections.push(this.logUI.renderRecentLogs(10));

    return sections.join('\n');
  }
}

// Export singleton instance
export const cli = CLIFacade.getInstance();

// Export all modules and types
export * from './engine';
export * from './modules/task';
export * from './modules/file';
export * from './modules/diff';
export * from './modules/chat';
export * from './modules/todo';
export * from './modules/log';
export * from './modules/tokenStats';
