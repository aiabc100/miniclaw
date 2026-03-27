import  dotenv from 'dotenv';
if (process.env.ANTHROPIC_API_KEY) {
  delete process.env.ANTHROPIC_API_KEY;
  console.log('deleted process.env.ANTHROPIC_API_KEY');
}
dotenv.config();
console.log(process.env.ANTHROPIC_API_KEY);

//---------------------------------------



import { LLMClient } from './llm-client';
import type { Tool, Message, AgentConfig, ToolCall } from './types';
import { builtinTools } from './tools';

class MiniClawAgent {
  private llm: LLMClient;
  private tools: Map<string, Tool>;
  private config: AgentConfig;
  private memory: Message[];

  constructor(config: AgentConfig) {
    this.config = config;
    this.llm = new LLMClient({
      apiKey: config.apiKey,
      apiEndpoint: config.apiEndpoint,
      model: config.model
    });

    // 注册工具
    this.tools = new Map();
    for (const tool of [...builtinTools, ...config.tools]) {
      this.tools.set(tool.name, tool);
    }

    // 初始化记忆（对话历史）
    this.memory = [
      { role: 'system', content: this.buildSystemPrompt() }
    ];
  }

  // 构建系统提示词
  private buildSystemPrompt(): string {
    const toolDescriptions = Array.from(this.tools.values())
      .map(t => `- ${t.name}: ${t.description}`)
      .join('\n');

    return `${this.config.systemPrompt}

    你可以使用以下工具来完成任务：
${toolDescriptions}

重要规则：
1. 当需要执行操作时，使用工具而不是假装执行
2. 每次只调用必要的工具，避免过度调用
3. 在回复用户前，确保已完成所有必要的操作
4. 如果工具执行失败，尝试其他方法或告知用户

当前时间：${new Date().toISOString()}
`;
  }

 // 核心：Agent 循环
  async run(
    userMessage: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    // 1. 添加用户消息到记忆
    this.memory.push({ role: 'user', content: userMessage });

    let iteration = 0;
    let finalResponse = '';

    // Agent 循环
    while (iteration < this.config.maxIterations) {
      iteration++;
      console.log(`\n--- 第 ${iteration} 轮迭代 ---`);

      // 2. 调用 LLM
      const response = await this.llm.chat(
        this.memory,
        this.getToolDefinitions(),
        onChunk
      );

      // 3. 根据响应类型决定下一步
      if (response.finishReason === 'stop') {
        // 没有工具调用，任务完成
        finalResponse = response.content;
        this.memory.push({ role: 'assistant', content: response.content });
        break;
      }

      if (response.finishReason === 'tool_calls' && response.toolCalls.length > 0) {
        // 有工具调用，执行工具
        console.log(`发现 ${response.toolCalls.length} 个工具调用`);

        // 记录助手的工具调用请求
        this.memory.push({
          role: 'assistant',
          content: response.content,
          tool_calls: response.toolCalls
        });

        // 4. 执行所有工具调用
        for (const toolCall of response.toolCalls) {
          console.log(`执行工具: ${toolCall.function.name}`);

          const result = await this.executeTool(toolCall);

          // 将工具结果添加到记忆
          this.memory.push({
            role: 'tool',
            content: result,
            tool_call_id: toolCall.id
          });
        }

        // 继续循环，让 LLM 处理工具结果
        continue;
      }

      // 其他情况（如达到 token 限制），退出循环
      finalResponse = response.content || '任务处理异常';
      break;
    }

    if (iteration >= this.config.maxIterations) {
      finalResponse += '\n\n（已达到最大迭代次数，任务可能未完成）';
    }

    return finalResponse;
  }

  // 执行单个工具
  private async executeTool(toolCall: ToolCall): Promise<string> {
    const tool = this.tools.get(toolCall.function.name);

    if (!tool) {
      return `错误：未找到工具 "${toolCall.function.name}"`;
    }

    try {
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`工具参数:`, args);

      const result = await tool.execute(args);
      console.log(`工具结果:`, result.substring(0, 200) + (result.length > 200 ? '...' : ''));

      return result;
    } catch (error: any) {
      console.error(`工具执行错误:`, error);
      return `工具执行失败：${error.message}`;
    }
  }

  // 获取工具定义（用于 LLM 调用）
  private getToolDefinitions(): any[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }

  // 获取对话历史
  getHistory(): Message[] {
    return [...this.memory];
  }

  // 清空对话历史
  clearHistory(): void {
    this.memory = [
      { role: 'system', content: this.buildSystemPrompt() }
    ];
  }
}

export { MiniClawAgent };