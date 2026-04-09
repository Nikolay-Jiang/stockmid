import fs from 'fs';
import path from 'path';
import qwenRepo from '@repos/qwen-repo';
import logger from 'jet-logger';

const CACHE_DIR = path.join(__dirname, '../../data/qwen-cache');
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const generatingSet = new Set<string>();

async function isCacheValid(stockcode: string): Promise<boolean> {
    const filePath = path.join(CACHE_DIR, `${stockcode}.md`);
    try {
        const stat = await fs.promises.stat(filePath);
        const age = Date.now() - stat.mtimeMs;
        return age < CACHE_TTL_MS;
    } catch {
        return false;
    }
}

async function generateReportAsync(stockcode: string): Promise<void> {
    const filePath = path.join(CACHE_DIR, `${stockcode}.md`);
    try {
        logger.info(`[qwen-service] 开始生成报告: ${stockcode}`);
        const prompt = `请结合已有数据，对${stockcode}进行财务基本面分析`;
        const content = await qwenRepo.callQwen(prompt);
        if (content) {
            await fs.promises.mkdir(CACHE_DIR, { recursive: true });
            await fs.promises.writeFile(filePath, content, 'utf-8');
            logger.info(`[qwen-service] 报告生成完成: ${stockcode}`);
        }
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logger.err(`[qwen-service] 报告生成失败: ${stockcode} - ${errMsg}`);
    } finally {
        generatingSet.delete(stockcode);
    }
}

/**
 * 获取DeepSeek 信息
 */
async function getds(stockcode: string): Promise<string | null> {
    const filePath = path.join(CACHE_DIR, `${stockcode}.md`);

    if (await isCacheValid(stockcode)) {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        logger.info(`[qwen-service] 缓存命中: ${stockcode}`);
        return content;
    }

    if (generatingSet.has(stockcode)) {
        logger.info(`[qwen-service] 报告生成中: ${stockcode}`);
        return null;
    }

    generatingSet.add(stockcode);
    generateReportAsync(stockcode); // intentionally no await
    logger.info(`[qwen-service] 触发异步生成: ${stockcode}`);
    return null;
}

export default {
    getds
} as const;
