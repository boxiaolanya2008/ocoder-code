export type ModelProvider = 'deepseek-chat' | 'deepseek-coder' | 'qwen' | 'ernie' | 'glm' | 'moonshot' | 'minimax';

export interface ModelConfig {
  provider: ModelProvider;
  name: string;
  apiBase: string;
  supportsTools: boolean;
  supportsThinking: boolean;
  toolFormat: 'function_call' | 'tools';
}

export const MODEL_CONFIGS: Record<ModelProvider, ModelConfig> = {
  'deepseek-chat': {
    provider: 'deepseek-chat',
    name: 'deepseek-chat',
    apiBase: 'https://api.deepseek.com/v1',
    supportsTools: true,
    supportsThinking: false,
    toolFormat: 'function_call',
  },
  'deepseek-coder': {
    provider: 'deepseek-coder',
    name: 'deepseek-coder',
    apiBase: 'https://api.deepseek.com/v1',
    supportsTools: true,
    supportsThinking: false,
    toolFormat: 'function_call',
  },
  'qwen': {
    provider: 'qwen',
    name: 'qwen-turbo',
    apiBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    supportsTools: true,
    supportsThinking: false,
    toolFormat: 'tools',
  },
  'ernie': {
    provider: 'ernie',
    name: 'ernie-4.0-8k',
    apiBase: 'https://qianfan.baidubce.com/v2',
    supportsTools: true,
    supportsThinking: false,
    toolFormat: 'function_call',
  },
  'glm': {
    provider: 'glm',
    name: 'glm-4',
    apiBase: 'https://open.bigmodel.cn/api/paas/v4',
    supportsTools: true,
    supportsThinking: false,
    toolFormat: 'function_call',
  },
  'moonshot': {
    provider: 'moonshot',
    name: 'moonshot-v1-8k',
    apiBase: 'https://api.moonshot.cn/v1',
    supportsTools: true,
    supportsThinking: false,
    toolFormat: 'function_call',
  },
  'minimax': {
    provider: 'minimax',
    name: 'abab6.5s-chat',
    apiBase: 'https://api.minimax.chat/v1',
    supportsTools: true,
    supportsThinking: false,
    toolFormat: 'function_call',
  },
};

export function getModelConfig(model: string): ModelConfig {
  const provider = model as ModelProvider;
  if (MODEL_CONFIGS[provider]) {
    return MODEL_CONFIGS[provider];
  }
  return MODEL_CONFIGS['deepseek-chat'];
}

export function formatToolsForModel(tools: any[], model: string): any[] {
  const config = getModelConfig(model);

  if (config.toolFormat === 'tools') {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  return tools;
}

export function parseModelResponse(response: any, model: string): any {
  const config = getModelConfig(model);

  if (config.toolFormat === 'tools' && response.tool_calls) {
    return response.tool_calls.map((tc: any) => ({
      id: tc.function.id || `call_${Date.now()}`,
      type: 'function',
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    }));
  }

  return response;
}

export function getSystemPromptForModel(model: string): string {
  const config = getModelConfig(model);
  const basePrompt = `You are ocoder-code, an AI coding assistant.`;

  if (config.provider.startsWith('deepseek')) {
    return basePrompt + `\n\nYou have access to tools. Use them when appropriate to help the user.`;
  }

  return basePrompt;
}
