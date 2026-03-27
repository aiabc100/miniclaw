import  dotenv from 'dotenv';
if (process.env.ANTHROPIC_API_KEY) {
  delete process.env.ANTHROPIC_API_KEY;
  console.log('deleted process.env.ANTHROPIC_API_KEY');
}
dotenv.config();
console.log(process.env.ANTHROPIC_API_KEY);

//---------------------------------------

// llm-client.ts

import type { Message, ToolCall } from './types';

interface LLMResponse {
  content: string;
  toolCalls: ToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length';
}

class LLMClient {
  private apiKey: string;
  private apiEndpoint: string;
  private model: string;

  constructor(config: {
    apiKey: string;
    apiEndpoint?: string;
    model: string;
  }) {
    this.apiKey = config.apiKey;
    this.apiEndpoint = config.apiEndpoint || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    this.model = config.model;
  }

  async chat(
    messages: Message[],
    tools: any[],
    onChunk?: (chunk: string) => void
  ): Promise<LLMResponse> {
    const formattedMessages = this.formatMessages(messages);

    const requestBody: any = {
      model: this.model,
      messages: formattedMessages,
      stream: true
    };

    if (tools.length > 0) {
      requestBody.tools = this.formatTools(tools);
    }

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API 调用失败: ${error}`);
    }

    return this.handleStream(response, onChunk);
  }

  private formatMessages(messages: Message[]): any[] {
    const result: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        result.push({
          role: 'system',
          content: msg.content
        });
        continue;
      }

      if (msg.role === 'tool') {
        result.push({
          role: 'tool',
          tool_call_id: msg.tool_call_id,
          content: msg.content
        });
      } else if (msg.tool_calls && msg.tool_calls.length > 0) {
        result.push({
          role: 'assistant',
          content: msg.content || null,
          tool_calls: msg.tool_calls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments
            }
          }))
        });
      } else {
        result.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    return result;
  }

  private formatTools(tools: any[]): any[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  private async handleStream(
    response: Response,
    onChunk?: (chunk: string) => void
  ): Promise<LLMResponse> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('无法读取响应流');

    const decoder = new TextDecoder();
    let content = '';
    let toolCalls: ToolCall[] = [];
    let finishReason: 'stop' | 'tool_calls' | 'length' = 'stop';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

      for (const line of lines) {
        const data = line.trim().slice(6);
        if (data === '[DONE]') continue;

        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta;
          const finish = json.choices?.[0]?.finish_reason;

          if (delta?.content) {
            content += delta.content;
            onChunk?.(delta.content);
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const existingIndex = toolCalls.findIndex(t => t.id === tc.id);
              
              if (existingIndex === -1) {
                toolCalls.push({
                  id: tc.id,
                  type: 'function',
                  function: {
                    name: tc.function?.name || '',
                    arguments: tc.function?.arguments || ''
                  }
                });
              } else {
                if (tc.function?.arguments) {
                  toolCalls[existingIndex]!.function.arguments += tc.function.arguments;
                }
              }
            }
          }

          if (finish) {
            if (finish === 'tool_calls' || finish === 'function_call') {
              finishReason = 'tool_calls';
            } else if (finish === 'length') {
              finishReason = 'length';
            } else {
              finishReason = 'stop';
            }
          }
        } catch (e) {
          // 忽略解析错误，继续处理
        }
      }
    }

    return { content, toolCalls, finishReason };
  }
}

export { LLMClient };
export type { LLMResponse };
