import logger from 'jet-logger';

const BASE_URL = 'https://dashscope.aliyuncs.com/api/v2/apps/protocols/compatible-mode/v1';
const API_KEY = process.env.DASHSCOPE_API_KEY || '';
const TIMEOUT = 120000;

const SYSTEM_PROMPT = "你现在是一名商业数据分析师,你精通数据分析方法和工具，能够从大量数据中提取出有价值的商业洞察。你对业务运营有深入的理解，并能提供数据驱动的优化建议。请在这个角色下为我解答以下问题。";

function extractOutputText(data: any): string | null {
    if (!data.output || !Array.isArray(data.output)) {
        return null;
    }
    const messageOutput = data.output.find((item: any) => item.type === 'message');
    if (!messageOutput || !messageOutput.content || !Array.isArray(messageOutput.content)) {
        return null;
    }
    const textContent = messageOutput.content.find((item: any) => item.type === 'output_text');
    return textContent?.text || null;
}

async function callQwen(prompt: string): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
        const response = await fetch(`${BASE_URL}/responses`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'qwen3.5-plus',
                input: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt }
                ],
                tools: [{ type: 'web_search' }],
                temperature: 0.2,
                stream: false,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            logger.err(`API请求失败: ${response.status} - ${errorText}`);
            throw new Error(`API请求失败: ${response.status}`);
        }

        const data = await response.json();
        const outputText = extractOutputText(data);
        
        if (!outputText) {
            logger.err('API响应格式异常: 无法提取输出文本');
            throw new Error('API响应格式异常');
        }

        return outputText;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            logger.err('API请求超时');
            throw new Error('API请求超时');
        }
        const errMsg = error instanceof Error ? error.message : String(error);
        logger.err(`API请求失败: ${errMsg}`);
        throw error;
    }
}

export default {
    callQwen
} as const;
