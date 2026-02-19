import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Config } from './config';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  toolCallId: string;
  output: string;
  isError?: boolean;
}

export interface ChatResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      toolCalls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finishReason: string;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamChunk {
  id: string;
  choices: Array<{
    index: number;
    delta: Partial<Message>;
    finishReason?: string;
  }>;
}

export class ApiClient {
  private config: Config;
  private baseURL: string;

  constructor(config: Config) {
    this.config = config;
    this.baseURL = config.apiBase;
  }

  async chat(
    messages: Message[],
    tools?: any,
    stream: boolean = false
  ): Promise<{ response: ChatResponse; stream?: AsyncIterableIterator<StreamChunk> }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };

    const body: any = {
      model: this.config.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: stream || false,
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map((tool: any) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));
      body.tool_choice = 'auto';
    }

    if (stream) {
      const response = await this.makeRequest(headers, body, true);
      return {
        response: {} as ChatResponse,
        stream: this.createStreamIterator(response),
      };
    }

    const response = await this.makeRequest(headers, body, false);
    return { response: response.data };
  }

  private async makeRequest(
    headers: Record<string, string>,
    body: any,
    stream: boolean
  ): Promise<AxiosResponse> {
    const config: AxiosRequestConfig = {
      url: `${this.baseURL}/chat/completions`,
      method: 'POST',
      headers,
      data: body,
      responseType: stream ? 'stream' : 'json',
    };

    return axios(config);
  }

  private async *createStreamIterator(response: AxiosResponse): AsyncIterableIterator<StreamChunk> {
    for await (const chunk of response.data) {
      const lines = chunk.toString().split('\n').filter((line: string) => line.trim() !== '' && line.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          return;
        }
        try {
          yield JSON.parse(data);
        } catch (e) {
        }
      }
    }
  }
}

export function createApiClient(config: Config): ApiClient {
  return new ApiClient(config);
}

export async function* streamChat(
  config: Config,
  messages: Message[],
  tools?: any
): AsyncGenerator<{ type: 'content' | 'tool_call' | 'done'; content?: string; toolCall?: ToolCall }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
  };

  const body: any = {
    model: config.model,
    messages,
    stream: true,
  };

  if (tools) {
    body.tools = tools;
  }

  const axios = require('axios');
  const response = await axios({
    url: `${config.apiBase}/chat/completions`,
    method: 'POST',
    headers,
    data: body,
    responseType: 'stream',
  });

  let buffer = '';
  for await (const chunk of response.data) {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const data = trimmed.slice(6);
      if (data === '[DONE]') {
        yield { type: 'done' };
        return;
      }

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;
        if (delta?.content) {
          yield { type: 'content', content: delta.content };
        }
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            yield { type: 'tool_call', toolCall: tc };
          }
        }
      } catch (e) {
      }
    }
  }
}
