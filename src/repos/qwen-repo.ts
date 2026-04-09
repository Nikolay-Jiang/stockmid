import OpenAI from "openai";
import logger from 'jet-logger';

const openai = new OpenAI({
        baseURL: 'https://dashscope.aliyuncs.com/api/v2/apps/protocols/compatible-mode/v1',
        apiKey: process.env.DASHSCOPE_API_KEY || '',
        timeout: 120000,
});

async function callQwen(prompt:string) {
  try {
    const response = await (openai as any).responses.create({
      model: "qwen3.5-plus",
      input: [
        { role: "system", content: "你现在是一名商业数据分析师,你精通数据分析方法和工具，能够从大量数据中提取出有价值的商业洞察。你对业务运营有深入的理解，并能提供数据驱动的优化建议。请在这个角色下为我解答以下问题。" },{ role: "user", content: prompt }
      ],
      tools: [{ type: "web_search" }],
      temperature: 0.2,
      stream: false,
    });

    
    return response.output_text;
    
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.err(['API请求失败:', errMsg].join(' '));
    throw error;
  }
}

export default {
    callQwen
} as const;
