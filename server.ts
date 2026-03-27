import  dotenv from 'dotenv';
if (process.env.ANTHROPIC_API_KEY) {
  delete process.env.ANTHROPIC_API_KEY;
  console.log('deleted process.env.ANTHROPIC_API_KEY');
}
dotenv.config();
console.log(process.env.ANTHROPIC_API_KEY);

//---------------------------------------
// server.ts
import express from 'express';
import type { Request, Response } from 'express';
import { MiniClawAgent } from './agent';
import { loadSkills } from './skill-loader';

const app = express();
app.use(express.json());

let loadedSkills: any[] = [];

app.get('/', (req: Request, res: Response) => {
  res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MiniClaw 聊天</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; height: 100vh; display: flex; flex-direction: column; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
    .header h1 { font-size: 24px; }
    .chat-container { flex: 1; overflow-y: auto; padding: 20px; max-width: 800px; width: 100%; margin: 0 auto; }
    .message { margin-bottom: 16px; display: flex; }
    .message.user { justify-content: flex-end; }
    .message-content { max-width: 70%; padding: 12px 16px; border-radius: 18px; line-height: 1.5; white-space: pre-wrap; }
    .message.user .message-content { background: #667eea; color: white; border-bottom-right-radius: 4px; }
    .message.assistant .message-content { background: white; color: #333; border-bottom-left-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
    .input-container { padding: 20px; background: white; border-top: 1px solid #e0e0e0; }
    .input-wrapper { max-width: 800px; margin: 0 auto; display: flex; gap: 12px; }
    #messageInput { flex: 1; padding: 12px 16px; border: 1px solid #ddd; border-radius: 24px; font-size: 16px; outline: none; }
    #messageInput:focus { border-color: #667eea; }
    #sendBtn { padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 24px; font-size: 16px; cursor: pointer; transition: transform 0.1s; }
    #sendBtn:hover { transform: scale(1.05); }
    #sendBtn:disabled { opacity: 0.6; cursor: not-allowed; }
    .loading { display: none; color: #666; font-style: italic; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🤖 MiniClaw 聊天助手</h1>
  </div>
  <div class="chat-container" id="chatContainer">
    <div class="message assistant">
      <div class="message-content">你好！我是 MiniClaw，有什么可以帮助你的吗？</div>
    </div>
  </div>
  <div class="loading" id="loading">正在思考中...</div>
  <div class="input-container">
    <div class="input-wrapper">
      <input type="text" id="messageInput" placeholder="输入消息..." autocomplete="off">
      <button id="sendBtn">发送</button>
    </div>
  </div>
  <script>
    const chatContainer = document.getElementById('chatContainer');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const loading = document.getElementById('loading');
    const sessionId = 'session_' + Date.now();
    function addMessage(content, isUser) {
      const div = document.createElement('div');
      div.className = 'message ' + (isUser ? 'user' : 'assistant');
      div.innerHTML = '<div class="message-content">' + content + '</div>';
      chatContainer.appendChild(div);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    async function sendMessage() {
      const message = messageInput.value.trim();
      if (!message) return;
      addMessage(message, true);
      messageInput.value = '';
      sendBtn.disabled = true;
      loading.style.display = 'block';
      try {
        const response = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, message })
        });
        const data = await response.json();
        addMessage(data.response || data.error || '发生错误', false);
      } catch (e) {
        addMessage('网络错误: ' + e.message, false);
      }
      sendBtn.disabled = false;
      loading.style.display = 'none';
      messageInput.focus();
    }
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    messageInput.focus();
  </script>
</body>
</html>
  `);
});

// 存储会话
const sessions = new Map<string, MiniClawAgent>();

function getOrCreateAgent(sessionId: string): MiniClawAgent {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, new MiniClawAgent({
      model: 'GLM-4-Flash',
      apiKey: process.env.ANTHROPIC_API_KEY!,
      systemPrompt: '你是 MiniClaw，一个有用的 AI 助手。',
      tools: loadedSkills,
      maxIterations: 10
    }));
  }
  return sessions.get(sessionId)!;
}

app.post('/chat', async (req: Request, res: Response) => {
  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ error: '缺少 sessionId 或 message' });
  }

  const agent = getOrCreateAgent(sessionId);

  try {
    const response = await agent.run(message);
    res.json({ response });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  console.log('正在加载 skills...');
  loadedSkills = await loadSkills();
  console.log(`已加载 ${loadedSkills.length} 个 skill`);
  
  app.listen(PORT, () => {
    console.log(`MiniClaw 服务运行在 http://localhost:${PORT}`);
  });
}

startServer();