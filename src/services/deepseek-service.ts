import deepseekRepo from '@repos/deepseek-repo';
import commonService from '@services/common-service';

//缓存保留12小时
const cacheTTL: number = 12*60*60*1000 
const cacheTTLShort: number = 60000

/**
 * 获取DeepSeek 信息
 */
async function getds(stockcode: string): Promise<string | null> {

    const prompt="请结合已有数据，对"+stockcode+"进行财务基本面分析"
    var cache = require('memory-cache');
    var cacheKey: string = "ds:" + stockcode;
    var cacheresult = cache.get(cacheKey);
    if (cacheresult != null) {
        return cacheresult;
    }
    console.log("no cache",cacheKey);
    const content = await deepseekRepo.callDeepSeek(prompt);

    if (commonService.checkCache()) {
            cache.put(cacheKey, content, cacheTTL);
    }

    return content;
}

export default {
    getds
} as const;