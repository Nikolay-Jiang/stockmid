import OpenAI from "openai";

const openai = new OpenAI({
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1/',
        apiKey: '',
});

async function callDeepSeek(prompt:string) {
  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: "你现在是一名商业数据分析师,你精通数据分析方法和工具，能够从大量数据中提取出有价值的商业洞察。你对业务运营有深入的理解，并能提供数据驱动的优化建议。请在这个角色下为我解答以下问题。" },{ role: "user", content: prompt }],
      model: "qwen-plus",
      temperature:0.2,
      stream: false,
      //enable_search:true,
    });

    
    return completion.choices[0].message.content;
    
  } catch (error) {
    console.error('API请求失败:', error.response ? error.response.data : error.message);
    throw error;
  }
}

export default {
    callDeepSeek
} as const;