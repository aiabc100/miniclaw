// types.ts

// 消息类型
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;    // 工具调用的 ID
  tool_calls?: ToolCall[];  // 助手请求的工具调用
}

// 工具调用
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;  // JSON 字符串
  };
}

// 工具定义
export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
    }>;
    required: string[];
  };
  execute: (args: Record<string, any>) => Promise<string>;
}

// Agent 配置
export interface AgentConfig {
  model: string;
  apiKey: string;
  apiEndpoint?: string;
  systemPrompt: string;
  tools: Tool[];
  maxIterations: number;  // 最大循环次数，防止无限循环
}