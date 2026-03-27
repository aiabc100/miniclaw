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
  maxIterations: number;
}

// Skill 元数据 (YAML frontmatter)
export interface SkillMeta {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Skill 参数定义
export interface SkillParameter {
  type: string;
  description: string;
  required?: boolean;
}

// Skill 执行上下文
export interface ExecutionContext {
  sessionId?: string;
  userId?: string;
  timestamp: number;
}

// Skill 执行结果
export interface SkillResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  executionTime: number;
}

// 完整的 Skill 定义
export interface SkillDefinition {
  meta: SkillMeta;
  parameters: Record<string, SkillParameter>;
  examples: Array<{
    input: Record<string, any>;
    output: any;
    description: string;
  }>;
  executeCode: string;
}