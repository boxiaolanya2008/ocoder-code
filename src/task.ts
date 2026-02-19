export interface Todo {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'done' | 'blocked' | 'skipped';
  depends_on?: string[];
  auto_execute?: boolean;
  result?: string;
  error?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  todos: Todo[];
  status: 'active' | 'completed' | 'failed' | 'paused';
  created_at: Date;
  updated_at: Date;
}

export interface UserInputRequest {
  task_id: string;
  question: string;
  options?: string[];
  type: 'text' | 'choice' | 'confirm' | 'file';
}

export interface Checkpoint {
  task_id: string;
  message: string;
  show_context?: any;
  created_at: Date;
}

export interface TaskManager {
  tasks: Map<string, Task>;
  currentTask?: string;
  checkpoints: Map<string, Checkpoint>;
  pendingInputs: Map<string, UserInputRequest>;
}

export class TaskManagerImpl implements TaskManager {
  tasks: Map<string, Task> = new Map();
  currentTask?: string;
  checkpoints: Map<string, Checkpoint> = new Map();
  pendingInputs: Map<string, UserInputRequest> = new Map();

  createTask(title: string, description?: string, todos: Todo[] = []): string {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task: Task = {
      id: taskId,
      title,
      description,
      todos: todos.map(todo => ({
        ...todo,
        created_at: new Date(),
        updated_at: new Date(),
      })),
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    this.tasks.set(taskId, task);
    this.currentTask = taskId;
    return taskId;
  }

  updateTodo(taskId: string, todoId: string, updates: Partial<Todo>): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const todo = task.todos.find(t => t.id === todoId);
    if (!todo) return false;

    Object.assign(todo, updates, { updated_at: new Date() });
    task.updated_at = new Date();
    
    this.checkTaskCompletion(taskId);
    return true;
  }

  addTodo(taskId: string, todo: Todo): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    todo.created_at = new Date();
    todo.updated_at = new Date();
    task.todos.push(todo);
    task.updated_at = new Date();
    
    return true;
  }

  getTaskStatus(taskId: string): Task | null {
    return this.tasks.get(taskId) || null;
  }

  getPendingTodos(taskId: string): Todo[] {
    const task = this.tasks.get(taskId);
    if (!task) return [];

    return task.todos.filter(todo => {
      if (todo.status !== 'pending') return false;
      
      if (todo.depends_on && todo.depends_on.length > 0) {
        return todo.depends_on.every(depId => {
          const depTodo = task.todos.find(t => t.id === depId);
          return depTodo?.status === 'done';
        });
      }
      
      return true;
    });
  }

  createCheckpoint(taskId: string, message: string, showContext?: any): string {
    const checkpointId = `checkpoint_${Date.now()}`;
    const checkpoint: Checkpoint = {
      task_id: taskId,
      message,
      show_context: showContext,
      created_at: new Date(),
    };
    
    this.checkpoints.set(checkpointId, checkpoint);
    return checkpointId;
  }

  requestUserInput(taskId: string, question: string, options?: string[], type: 'text' | 'choice' | 'confirm' | 'file' = 'text'): string {
    const inputId = `input_${Date.now()}`;
    const request: UserInputRequest = {
      task_id: taskId,
      question,
      options,
      type,
    };
    
    this.pendingInputs.set(inputId, request);
    return inputId;
  }

  private checkTaskCompletion(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const allDone = task.todos.every(todo => todo.status === 'done' || todo.status === 'skipped');
    const hasBlocked = task.todos.some(todo => todo.status === 'blocked');

    if (allDone) {
      task.status = 'completed';
    } else if (hasBlocked) {
      task.status = 'failed';
    }

    task.updated_at = new Date();
  }

  getTaskSummary(taskId: string): string {
    const task = this.tasks.get(taskId);
    if (!task) return 'Task not found';

    const completed = task.todos.filter(t => t.status === 'done').length;
    const total = task.todos.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return `Task: ${task.title}\nProgress: ${completed}/${total} (${progress}%)\nStatus: ${task.status}`;
  }
}

export const taskManager = new TaskManagerImpl();
