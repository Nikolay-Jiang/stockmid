import deepseekRepo from '@repos/deepseek-repo';
import commonService from '@services/common-service';

const cacheTTL: number = 60000
const cacheTTLShort: number = 60000

/**
 * 获取DeepSeek 信息
 */
async function getds(prompt: string): Promise<string | null> {
    var cache = require('memory-cache');
    var cacheKey: string = "ds" + prompt;
    var cacheresult = cache.get(cacheKey);
    if (cacheresult != null) {
        return cacheresult;
    }
    console.log("no cache");
    const content = await deepseekRepo.callDeepSeek(prompt);

    if (commonService.checkCache()) {
            cache.put(cacheKey, content, cacheTTL);
    }

    return content;
}

export default {
    getds
} as const;