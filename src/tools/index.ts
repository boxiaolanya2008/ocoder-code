import { Message } from '../api';

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export const BUILTIN_TOOLS: Tool[] = [
  {
    name: 'Task',
    description: 'Launch specialized sub-agents for complex multi-step tasks',
    parameters: {
      type: 'object',
      properties: {
        subagent_type: { type: 'string', enum: ['general-purpose', 'statusline-setup', 'output-style-setup'], description: 'Which agent type to use' },
        prompt: { type: 'string', description: 'Detailed task description for the agent' },
        description: { type: 'string', description: 'Short 3-5 word description of the task' },
      },
      required: ['subagent_type', 'prompt', 'description'],
    },
  },
  {
    name: 'Bash',
    description: 'Execute shell commands in a persistent bash session',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute' },
        description: { type: 'string', description: 'Clear 5-10 word description' },
        timeout: { type: 'number', description: 'Milliseconds before timeout (default: 120000, max: 600000)' },
        run_in_background: { type: 'boolean', description: 'Run command in background' },
      },
      required: ['command'],
    },
  },
  {
    name: 'Glob',
    description: 'List files and directories matching a glob pattern',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Glob pattern (e.g. *.ts)' },
        search_path: { type: 'string', description: 'Directory to search in' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'Grep',
    description: 'Search for content in files',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query or regex' },
        path: { type: 'string', description: 'Path to search in' },
        includes: { type: 'string', description: 'File filter (e.g. *.js)' },
        MatchPerLine: { type: 'boolean', description: 'Show matching lines' },
      },
      required: ['query'],
    },
  },
  {
    name: 'Read',
    description: 'Read files from the filesystem',
    parameters: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Absolute path to file' },
        offset: { type: 'number', description: 'Line number to start reading from' },
        limit: { type: 'number', description: 'Number of lines to read' },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'Edit',
    description: 'Perform exact string replacements in files',
    parameters: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Absolute path to file' },
        old_string: { type: 'string', description: 'Exact text to replace' },
        new_string: { type: 'string', description: 'Replacement text' },
        replace_all: { type: 'boolean', description: 'Replace all occurrences (default: false)' },
      },
      required: ['file_path', 'old_string', 'new_string'],
    },
  },
  {
    name: 'Write',
    description: 'Write or overwrite files',
    parameters: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Absolute path to file' },
        content: { type: 'string', description: 'Complete file content' },
      },
      required: ['file_path', 'content'],
    },
  },
  {
    name: 'NotebookEdit',
    description: 'Edit Jupyter notebook cells',
    parameters: {
      type: 'object',
      properties: {
        notebook_path: { type: 'string', description: 'Absolute path to notebook' },
        new_source: { type: 'string', description: 'New cell content' },
        cell_id: { type: 'string', description: 'ID of cell to edit' },
        cell_type: { type: 'string', enum: ['code', 'markdown'], description: 'Cell type' },
        edit_mode: { type: 'string', enum: ['replace', 'insert', 'delete'], description: 'Edit mode' },
      },
      required: ['notebook_path', 'new_source'],
    },
  },
  {
    name: 'WebFetch',
    description: 'Fetch and process web content',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Fully-formed valid URL' },
        prompt: { type: 'string', description: 'What information to extract from the page' },
      },
      required: ['url', 'prompt'],
    },
  },
  {
    name: 'WebSearch',
    description: 'Search the web for current information',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query string (min 2 characters)' },
        allowed_domains: { type: 'array', items: { type: 'string' }, description: 'Domains to include' },
        blocked_domains: { type: 'array', items: { type: 'string' }, description: 'Domains to exclude' },
      },
      required: ['query'],
    },
  },
  {
    name: 'TodoWrite',
    description: 'Create and manage structured task lists',
    parameters: {
      type: 'object',
      properties: {
        todos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'Task description' },
              activeForm: { type: 'string', description: 'Present continuous form' },
              status: { type: 'string', enum: ['pending', 'in_progress', 'completed'], description: 'Task status' },
            },
            required: ['content', 'activeForm', 'status'],
          },
        },
      },
      required: ['todos'],
    },
  },
  {
    name: 'ExitPlanMode',
    description: 'Exit plan mode after presenting an implementation plan',
    parameters: {
      type: 'object',
      properties: {
        plan: { type: 'string', description: 'The implementation plan (supports markdown)' },
      },
      required: ['plan'],
    },
  },
  {
    name: 'BashOutput',
    description: 'Retrieve output from running background bash shells',
    parameters: {
      type: 'object',
      properties: {
        bash_id: { type: 'string', description: 'ID of the background shell' },
        filter: { type: 'string', description: 'Regular expression to filter output lines' },
      },
      required: ['bash_id'],
    },
  },
  {
    name: 'KillShell',
    description: 'Terminate a running background bash shell',
    parameters: {
      type: 'object',
      properties: {
        shell_id: { type: 'string', description: 'ID of shell to terminate' },
      },
      required: ['shell_id'],
    },
  },
  {
    name: 'SlashCommand',
    description: 'Execute custom slash commands',
    parameters: {
      type: 'object',
      properties: {
        command_name: { type: 'string', description: 'Command name' },
        args: { type: 'string', description: 'Arguments' },
      },
      required: ['command_name'],
    },
  },
  {
    name: 'Tree',
    description: 'Generate a tree view of directory structure',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path to generate tree (default: current directory)' },
        depth: { type: 'number', description: 'Maximum depth (default: 3)' },
      },
    },
  },
  {
    name: 'apply_diff',
    description: 'Apply diff changes to a file using SEARCH/REPLACE blocks',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to modify' },
        diff: { type: 'string', description: 'Diff content with SEARCH/REPLACE blocks' },
      },
      required: ['path', 'diff'],
    },
  },
  {
    name: 'insert_lines',
    description: 'Insert lines at a specific line number',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to modify' },
        line_number: { type: 'number', description: 'Line number to insert at (1-based)' },
        content: { type: 'string', description: 'Content to insert' },
      },
      required: ['path', 'line_number', 'content'],
    },
  },
  {
    name: 'delete_lines',
    description: 'Delete lines starting from a specific line number',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to modify' },
        line_number: { type: 'number', description: 'Line number to start deleting from (1-based)' },
        count: { type: 'number', description: 'Number of lines to delete' },
      },
      required: ['path', 'line_number', 'count'],
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task with todo list',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description (optional)' },
        todos: { 
          type: 'array', 
          description: 'Initial todo list',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              content: { type: 'string' },
              status: { type: 'string', enum: ['pending', 'in_progress', 'done', 'blocked', 'skipped'] },
              depends_on: { type: 'array', items: { type: 'string' } },
              auto_execute: { type: 'boolean' }
            }
          }
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_todo',
    description: 'Update todo status or content',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID' },
        todo_id: { type: 'string', description: 'Todo ID' },
        status: { type: 'string', enum: ['pending', 'in_progress', 'done', 'blocked', 'skipped'] },
        content: { type: 'string', description: 'Modified content (optional)' },
        result: { type: 'string', description: 'Execution result summary (optional)' },
      },
      required: ['task_id', 'todo_id'],
    },
  },
  {
    name: 'add_todo',
    description: 'Add new todo dynamically',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID' },
        todo: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            content: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'done', 'blocked', 'skipped'] },
            depends_on: { type: 'array', items: { type: 'string' } },
            auto_execute: { type: 'boolean' }
          },
          required: ['id', 'content']
        },
      },
      required: ['task_id', 'todo'],
    },
  },
  {
    name: 'get_task_status',
    description: 'Get overall task progress',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'request_user_input',
    description: 'Request user input/choice/confirmation',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID' },
        question: { type: 'string', description: 'Question content' },
        options: { type: 'array', items: { type: 'string' }, description: 'Options (optional)' },
        type: { type: 'string', enum: ['text', 'choice', 'confirm', 'file'], default: 'text' },
      },
      required: ['task_id', 'question'],
    },
  },
  {
    name: 'create_checkpoint',
    description: 'Create checkpoint waiting for user confirmation',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID' },
        message: { type: 'string', description: 'Checkpoint description' },
        show_context: { type: 'object', description: 'Context to show user (optional)' },
      },
      required: ['task_id', 'message'],
    },
  },
  {
    name: 'execute_next_todo',
    description: 'Execute next pending auto-executable todo',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID' },
      },
      required: ['task_id'],
    },
  },
];

export function getToolsForModel(model: string): any[] {
  return BUILTIN_TOOLS;
}
