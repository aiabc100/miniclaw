// tools.ts

import type { Tool } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

// 安全命令白名单
const SAFE_COMMANDS = ['ls','dir', 'cat', 'head', 'tail', 'grep', 'wc', 'date', 'pwd', 'echo'];

// 危险模式黑名单
const DANGEROUS_PATTERNS = [
  /rm\s+-rf/,
  />\s*\//,
  /;\s*rm/,
  /\|\s*sh/,
  /\$\(/,
  /`/
];

function isSafeCommand(cmd: string): boolean {
  // 检查危险模式
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(cmd)) {
      return false;
    }
  }

  // 检查命令是否在白名单
  const baseCommand = cmd.trim().split(/\s+/)[0];
  return baseCommand ? SAFE_COMMANDS.includes(baseCommand) : false;
}

// 工具1: 执行 Shell 命令
const shellTool: Tool = {
  name: 'execute_shell',
  description: '执行 shell 命令。只能执行安全的只读命令，如 ls、cat、grep 等。',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: '要执行的 shell 命令'
      }
    },
    required: ['command']
  },
  async execute(args) {
    const { command } = args;

    if (!isSafeCommand(command)) {
      return `错误：该命令不在安全白名单中。只允许执行：${SAFE_COMMANDS.join(', ')}`;
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000,  // 30 秒超时
        maxBuffer: 1024 * 1024  // 1MB 缓冲区
      });

      return stdout || stderr || '命令执行成功（无输出）';
    } catch (error: any) {
      return `命令执行失败：${error.message}`;
    }
  }
};

// 工具2: 读取文件
const readFileTool: Tool = {
  name: 'read_file',
  description: '读取指定文件的内容',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '文件路径'
      },
      maxLines: {
        type: 'number',
        description: '最多读取的行数，默认 100'
      }
    },
    required: ['path']
  },
  async execute(args) {
    const { path: filePath, maxLines = 100 } = args;

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      if (lines.length > maxLines) {
        return lines.slice(0, maxLines).join('\n') +
          `\n\n... 文件共 ${lines.length} 行，只显示前 ${maxLines} 行`;
      }

      return content;
    } catch (error: any) {
      return `读取文件失败：${error.message}`;
    }
  }
};

// 工具3: 写入文件
const writeFileTool: Tool = {
  name: 'write_file',
  description: '将内容写入指定文件',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '文件路径'
      },
      content: {
        type: 'string',
        description: '要写入的内容'
      }
    },
    required: ['path', 'content']
  },
  async execute(args) {
    const { path: filePath, content } = args;

    // 安全检查：不允许写入系统目录
    const absolutePath = path.resolve(filePath);
    if (absolutePath.startsWith('/etc') ||
        absolutePath.startsWith('/usr') ||
        absolutePath.startsWith('/bin')) {
      return '错误：不允许写入系统目录';
    }

    try {
      // 确保目录存在
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, content, 'utf-8');
      return `文件已写入：${absolutePath}`;
    } catch (error: any) {
      return `写入文件失败：${error.message}`;
    }
  }
};

// 工具4: 网络请求
const fetchTool: Tool = {
  name: 'fetch_url',
  description: '获取指定 URL 的内容',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: '要请求的 URL'
      },
      method: {
        type: 'string',
        description: 'HTTP 方法，默认 GET'
      }
    },
    required: ['url']
  },
  async execute(args) {
    const { url, method = 'GET' } = args;

    try {
      const response = await fetch(url, { method });
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const json = await response.json();
        return JSON.stringify(json, null, 2);
      }

      const text = await response.text();

      // 限制返回长度
      if (text.length > 5000) {
        return text.substring(0, 5000) + '\n\n... 内容过长，已截断';
      }

      return text;
    } catch (error: any) {
      return `请求失败：${error.message}`;
    }
  }
};

// 工具5: 计算器
const calculatorTool: Tool = {
  name: 'calculator',
  description: '执行数学计算',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: '数学表达式，如 "2 + 2 * 3"'
      }
    },
    required: ['expression']
  },
  async execute(args) {
    const { expression } = args;

    // 安全检查：只允许数字和运算符
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      return '错误：表达式包含不允许的字符';
    }

    try {
      // 使用 Function 构造器计算（比 eval 稍安全）
      const result = new Function(`return ${expression}`)();
      return `计算结果：${expression} = ${result}`;
    } catch (error: any) {
      return `计算失败：${error.message}`;
    }
  }
};

// 导出所有工具
export const builtinTools: Tool[] = [
  shellTool,
  readFileTool,
  writeFileTool,
  fetchTool,
  calculatorTool
];