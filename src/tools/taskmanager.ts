import * as fs from 'fs';
import * as path from 'path';
import { taskManager, Task, Todo, UserInputRequest, Checkpoint } from '../task';

export async function createTask(title: string, description?: string, todos: any[] = []): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const processedTodos: Todo[] = todos.map(todo => ({
      id: todo.id,
      content: todo.content,
      status: todo.status || 'pending',
      depends_on: todo.depends_on || [],
      auto_execute: todo.auto_execute !== undefined ? todo.auto_execute : false,
    }));

    const taskId = taskManager.createTask(title, description, processedTodos);
    
    return { 
      success: true, 
      output: `Task created with ID: ${taskId}\n${taskManager.getTaskSummary(taskId)}` 
    };
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

export async function updateTodo(taskId: string, todoId: string, updates: any): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const success = taskManager.updateTodo(taskId, todoId, updates);
    
    if (!success) {
      return { success: false, output: '', error: 'Task or Todo not found' };
    }

    const summary = taskManager.getTaskSummary(taskId);
    return { success: true, output: `Todo ${todoId} updated\n${summary}` };
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

export async function addTodo(taskId: string, todo: any): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const processedTodo: Todo = {
      id: todo.id,
      content: todo.content,
      status: todo.status || 'pending',
      depends_on: todo.depends_on || [],
      auto_execute: todo.auto_execute !== undefined ? todo.auto_execute : false,
    };

    const success = taskManager.addTodo(taskId, processedTodo);
    
    if (!success) {
      return { success: false, output: '', error: 'Task not found' };
    }

    return { success: true, output: `Todo ${todo.id} added to task ${taskId}` };
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

export async function getTaskStatus(taskId: string): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const task = taskManager.getTaskStatus(taskId);
    
    if (!task) {
      return { success: false, output: '', error: 'Task not found' };
    }

    const summary = taskManager.getTaskSummary(taskId);
    const todoDetails = task.todos.map(todo => 
      `[${todo.status.toUpperCase()}] ${todo.id}: ${todo.content}${todo.depends_on ? ` (depends: ${todo.depends_on.join(', ')})` : ''}`
    ).join('\n');

    return { 
      success: true, 
      output: `${summary}\n\nTodos:\n${todoDetails}` 
    };
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

export async function requestUserInput(taskId: string, question: string, options?: string[], type: 'text' | 'choice' | 'confirm' | 'file' = 'text'): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const inputId = taskManager.requestUserInput(taskId, question, options, type);
    
    let prompt = question;
    if (options && options.length > 0) {
      prompt += '\nOptions:\n' + options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
    }
    
    return { 
      success: true, 
      output: `User input requested (${inputId}):\n${prompt}\n\nPlease respond to continue.` 
    };
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

export async function createCheckpoint(taskId: string, message: string, showContext?: any): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const checkpointId = taskManager.createCheckpoint(taskId, message, showContext);
    
    let output = `Checkpoint created (${checkpointId}):\n${message}`;
    
    if (showContext) {
      output += '\n\nContext:\n' + JSON.stringify(showContext, null, 2);
    }
    
    output += '\n\nWaiting for user confirmation to continue...';
    
    return { success: true, output };
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

export async function executeNextTodo(taskId: string): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const task = taskManager.getTaskStatus(taskId);
    if (!task) {
      return { success: false, output: '', error: 'Task not found' };
    }

    const pendingTodos = taskManager.getPendingTodos(taskId);
    
    if (pendingTodos.length === 0) {
      return { success: true, output: 'No pending todos to execute.' };
    }

    const nextTodo = pendingTodos.find(todo => todo.auto_execute);
    
    if (!nextTodo) {
      return { 
        success: false, 
        output: '', 
        error: 'No auto-executable todos found. Manual confirmation required.' 
      };
    }

    taskManager.updateTodo(taskId, nextTodo.id, { status: 'in_progress' });
    
    return { 
      success: true, 
      output: `Executing todo ${nextTodo.id}: ${nextTodo.content}` 
    };
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}
