import OpenAI from "openai";

const openai = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: ''
});

async function callDeepSeek(prompt:string) {
  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "deepseek-chat",
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