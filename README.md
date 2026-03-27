# MiniClaw

一个轻量级的 AI Agent 框架，支持工具调用、流式响应、多轮对话和动态 Skill 加载。基于 TypeScript 开发，使用 Bun 运行时。

## 特性

- **Agent 循环机制** - 自动进行多轮工具调用直到任务完成
- **动态 Skill 加载** - 通过 Markdown 文件定义 Skill，启动时自动加载
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

注意：Windows 环境先打开 Docker Desktop。

```bash
# 构建镜像
docker build -t miniclaw .

# 运行 CLI 容器
docker run -it -e ANTHROPIC_API_KEY="your_api_key_here" miniclaw

# 运行服务容器
docker run -d -p 3000:3000 -e ANTHROPIC_API_KEY=your_api_key miniclaw
```

## 项目结构

```
miniclaw/
├── agent.ts          # Agent 核心逻辑（循环、工具调用）
├── llm-client.ts     # LLM API 客户端（支持流式响应）
├── tools.ts          # 内置工具定义
├── types.ts          # TypeScript 类型定义
├── skill-loader.ts   # 动态 Skill 加载器
├── cli.ts            # 命令行界面
├── server.ts         # HTTP 服务
├── skills/           # Skill 定义目录
│   ├── weather.md    # 天气查询 Skill
│   └── skill-creator.md  # Skill 创建器
├── .env.example      # 环境变量模板
└── .env              # 环境变量（不提交到 Git）
```

## Skill 系统

### Skill 文件格式

使用 YAML frontmatter + Markdown 格式定义 Skill：

```markdown
---
id: my-skill
name: 我的技能
version: 1.0.0
description: 技能描述
author: 作者
tags: [标签1, 标签2]
createdAt: 2024-01-01
updatedAt: 2024-01-15
---

# 我的技能

技能详细描述...

## 参数定义

```json
{
  "input": {
    "type": "string",
    "description": "输入参数描述",
    "required": true
  }
}
```

## 示例

```json
[{ "input": "示例输入", "output": "示例输出", "description": "示例说明" }]
```

## 实现代码

```typescript
async function execute(params, context) {
  const startTime = Date.now();
  try {
    // 实现逻辑
    return {
      success: true,
      data: {},
      message: "执行成功",
      executionTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "执行失败",
      executionTime: Date.now() - startTime
    };
  }
}
```
```

### 内置 Skill

| Skill | 描述 |
|-------|------|
| `weather` | 查询指定城市的实时天气信息 |
| `skill-creator` | 根据自然语言描述自动生成 Skill 文件 |

### 添加自定义 Skill

1. 在 `skills/` 目录下创建 `.md` 文件
2. 按照上述格式定义 Skill
3. 重启服务，自动加载

或使用 `skill-creator` 自动生成：

```
用户: 帮我创建一个查询股票价格的技能
Agent: [调用 skill-creator]
       已创建技能文件: skills/stock.md
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
  model: 'GLM-4-Flash',
  apiKey: process.env.ANTHROPIC_API_KEY,
  apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  systemPrompt: '你是一个有用的 AI 助手。',
  tools: [],
  maxIterations: 10
});
```

### 支持的 API 端点

| 平台 | Endpoint | 模型示例 |
|-----|----------|---------|
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4/chat/completions` | GLM-4-Flash |
| MiniMax | `https://api.minimax.chat/v1/chat/completions` | MiniMax-M2 |
| DeepSeek | `https://api.deepseek.com/chat/completions` | deepseek-chat |

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
