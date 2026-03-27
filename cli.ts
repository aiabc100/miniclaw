import  dotenv from 'dotenv';
if (process.env.ANTHROPIC_API_KEY) {
  delete process.env.ANTHROPIC_API_KEY;
  console.log('deleted process.env.ANTHROPIC_API_KEY');
}
dotenv.config();
console.log(process.env.ANTHROPIC_API_KEY);

//---------------------------------------

// cli.ts

import * as readline from 'readline';
import { MiniClawAgent } from './agent';

async function main() {
  // 从环境变量获取 API Key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('请设置 ANTHROPIC_API_KEY 环境变量');
    process.exit(1);
  }

  // 创建 Agent 实例
  const agent = new MiniClawAgent({
    model: 'GLM-4-Flash',
    apiKey,
    systemPrompt: `你是 MiniClaw，一个简化版的 AI Agent。
你可以帮助用户完成各种任务，包括：
- 执行 shell 命令查看系统信息
- 读取和写入文件
- 进行网络请求
- 数学计算

请简洁、准确地回答问题，必要时使用工具完成任务。`,
    tools: [],  // 使用内置工具
    maxIterations: 10
  });

  // 创建命令行界面
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('========================================');
  console.log('🤖 MiniClaw - 简化版 OpenClaw');
  console.log('========================================');
  console.log('输入消息与 Agent 对话，输入 "exit" 退出');
  console.log('输入 "clear" 清空对话历史');
  console.log('----------------------------------------\n');

  const prompt = () => {
    rl.question('你: ', async (input) => {
      const trimmed = input.trim();

      if (trimmed === 'exit') {
        console.log('再见！');
        rl.close();
        return;
      }

      if (trimmed === 'clear') {
        agent.clearHistory();
        console.log('对话历史已清空\n');
        prompt();
        return;
      }

      if (!trimmed) {
        prompt();
        return;
      }

      try {
        process.stdout.write('MiniClaw: ');

        const response = await agent.run(trimmed, (chunk) => {
          // 流式输出
          process.stdout.write(chunk);
        });

        // 如果没有流式输出，直接打印完整响应
        if (!response.startsWith('MiniClaw: ')) {
          console.log();  // 换行
        }

        console.log('\n');
      } catch (error: any) {
        console.error(`\n错误: ${error.message}\n`);
      }

      prompt();
    });
  };

  prompt();
}

main();