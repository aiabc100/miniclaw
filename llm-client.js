// llm-client.ts
class LLMClient {
    apiKey;
    apiEndpoint;
    model;
    constructor(config) {
        this.apiKey = config.apiKey;
        this.apiEndpoint = config.apiEndpoint || 'https://api.anthropic.com/v1/messages';
        this.model = config.model;
    }
    async chat(messages, tools, onChunk) {
        // 转换消息格式（适配 Claude API）
        const formattedMessages = this.formatMessages(messages);
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: this.model,
                max_tokens: 4096,
                messages: formattedMessages,
                tools: this.formatTools(tools),
                stream: true // 启用流式响应
            })
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API 调用失败: ${error}`);
        }
        // 处理流式响应
        return this.handleStream(response, onChunk);
    }
    formatMessages(messages) {
        // 将我们的消息格式转换为 Claude API 格式
        const result = [];
        for (const msg of messages) {
            if (msg.role === 'system') {
                // Claude 的 system 放在请求根级别，这里跳过
                continue;
            }
            if (msg.role === 'tool') {
                // 工具结果
                result.push({
                    role: 'user',
                    content: [{
                            type: 'tool_result',
                            tool_use_id: msg.tool_call_id,
                            content: msg.content
                        }]
                });
            }
            else if (msg.tool_calls && msg.tool_calls.length > 0) {
                // 助手的工具调用
                result.push({
                    role: 'assistant',
                    content: msg.tool_calls.map(tc => ({
                        type: 'tool_use',
                        id: tc.id,
                        name: tc.function.name,
                        input: JSON.parse(tc.function.arguments)
                    }))
                });
            }
            else {
                result.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        }
        return result;
    }
    formatTools(tools) {
        // 转换为 Claude 的工具格式
        return tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.parameters
        }));
    }
    async handleStream(response, onChunk) {
        const reader = response.body?.getReader();
        if (!reader)
            throw new Error('无法读取响应流');
        const decoder = new TextDecoder();
        let content = '';
        let toolCalls = [];
        let finishReason = 'stop';
        let currentToolUse = null;
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
            for (const line of lines) {
                const data = line.slice(6); // 去掉 'data: ' 前缀
                if (data === '[DONE]')
                    continue;
                try {
                    const event = JSON.parse(data);
                    if (event.type === 'content_block_start') {
                        if (event.content_block.type === 'tool_use') {
                            currentToolUse = {
                                id: event.content_block.id,
                                name: event.content_block.name,
                                arguments: ''
                            };
                        }
                    }
                    else if (event.type === 'content_block_delta') {
                        if (event.delta.type === 'text_delta') {
                            content += event.delta.text;
                            onChunk?.(event.delta.text);
                        }
                        else if (event.delta.type === 'input_json_delta') {
                            if (currentToolUse) {
                                currentToolUse.arguments += event.delta.partial_json;
                            }
                        }
                    }
                    else if (event.type === 'content_block_stop') {
                        if (currentToolUse) {
                            toolCalls.push({
                                id: currentToolUse.id,
                                type: 'function',
                                function: {
                                    name: currentToolUse.name,
                                    arguments: currentToolUse.arguments
                                }
                            });
                            currentToolUse = null;
                        }
                    }
                    else if (event.type === 'message_delta') {
                        if (event.delta.stop_reason === 'tool_use') {
                            finishReason = 'tool_calls';
                        }
                    }
                }
                catch (e) {
                    // 忽略解析错误，继续处理
                }
            }
        }
        return { content, toolCalls, finishReason };
    }
}
export { LLMClient };
