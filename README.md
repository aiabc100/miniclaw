# MiniClaw

一个轻量级的 AI Agent 框架，支持工具调用、流式响应和多轮对话。基于 TypeScript 开发，使用 Bun 运行时。

## 特性

- **Agent 循环机制** - 自动进行多轮工具调用直到任务完成
- **内置工具** - Shell 命令执行、文件读写、网络请求、计算器
- **流式响应** - 实时输出 AI 回复，提升用户体验
- **多模型支持** - 支持 GLM、MiniMax、DeepSeek 等 OpenAI 兼容 API
- **安全设计** - Shell 命令白名单、危险操作拦截
- **TypeScript** - 完整类型支持

## 安装

确保已安装 [Bun](https://bun.sh/) 运行时：

```bash
# 克隆项目
git clone https://github.com/aiabc100/miniclaw.git
cd miniclaw

# 安装依赖
bun install
```

## 配置

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API Key：

```
ANTHROPIC_API_KEY=your_api_key_here
```

> 虽然变量名为 `ANTHROPIC_API_KEY`，但实际上可以填入 GLM、MiniMax、DeepSeek 等 API Key

## 使用方式

### 命令行模式

```bash
bun run cli.ts
```

交互式命令行界面，支持：

- 输入消息与 Agent 对话
- 输入 `exit` 退出
- 输入 `clear` 清空对话历史

### HTTP 服务模式

```bash
bun run server.ts
```

启动 REST API 服务（默认端口 3000）：

```bash
# 发送对话请求
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test", "message": "你好"}'
```

服务启动后访问 `http://localhost:3000` 可使用内置的 Web 聊天界面。

### Docker 部署

使用 Docker Compose 一键部署：

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

或使用 Docker 直接构建：

```bash
# 构建镜像
docker build -t miniclaw .

# 运行容器
docker run -d -p 3000:3000 -e ANTHROPIC_API_KEY=your_api_key miniclaw
```

## 项目结构

```
miniclaw/
├── agent.ts        # Agent 核心逻辑（循环、工具调用）
├── llm-client.ts   # LLM API 客户端（支持流式响应）
├── tools.ts        # 内置工具定义
├── types.ts        # TypeScript 类型定义
├── cli.ts          # 命令行界面
├── server.ts       # HTTP 服务
├── .env.example    # 环境变量模板
└── .env            # 环境变量（不提交到 Git）
```

## 内置工具

| 工具名称 | 描述 | 安全限制 |
|---------|------|---------|
| `execute_shell` | 执行 Shell 命令 | 仅允许白名单命令（ls, cat, grep 等） |
| `read_file` | 读取文件内容 | 支持行数限制 |
| `write_file` | 写入文件 | 禁止写入系统目录 |
| `fetch_url` | HTTP 请求 | 返回内容长度限制 |
| `calculator` | 数学计算 | 仅允许数字和运算符 |

## 自定义配置

### 更换 LLM 模型

编辑 `cli.ts` 或 `server.ts` 中的配置：

```typescript
const agent = new MiniClawAgent({
  model: 'GLM-4-Flash',           // 模型名称
  apiKey: process.env.ANTHROPIC_API_KEY,
  apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', // 可选
  systemPrompt: '你是一个有用的 AI 助手。',
  tools: [],                       // 额外工具
  maxIterations: 10                // 最大迭代次数
});
```

### 支持的 API 端点

| 平台 | Endpoint | 模型示例 |
|-----|----------|---------|
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4/chat/completions` | GLM-4-Flash |
| MiniMax | `https://api.minimax.chat/v1/chat/completions` | MiniMax-M2 |
| DeepSeek | `https://api.deepseek.com/chat/completions` | deepseek-chat |

### 添加自定义工具

```typescript
import type { Tool } from './types';

const myTool: Tool = {
  name: 'my_tool',
  description: '工具描述',
  parameters: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: '参数描述' }
    },
    required: ['param1']
  },
  async execute(args) {
    // 工具逻辑
    return '执行结果';
  }
};

// 在创建 Agent 时传入
const agent = new MiniClawAgent({
  // ...
  tools: [myTool]
});
```

## Agent 工作流程

```
用户输入
    ↓
┌─────────────────────────────┐
│      Agent 循环             │
│  ┌─────────────────────┐    │
│  │  1. 调用 LLM        │    │
│  │  2. 判断响应类型    │    │
│  │     ├─ stop → 结束  │    │
│  │     └─ tool_calls   │    │
│  │          ↓          │    │
│  │  3. 执行工具        │    │
│  │  4. 添加结果到记忆  │    │
│  │  5. 继续循环        │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
    ↓
返回最终结果
```

## 开发

```bash
# 类型检查
npx tsc --noEmit

# 运行 CLI
bun run cli.ts

# 运行服务
bun run server.ts
```

## License

MIT

## 致谢

本项目是学习 AI Agent 开发的实践项目，参考了 OpenClaw 等开源项目的设计思路。
