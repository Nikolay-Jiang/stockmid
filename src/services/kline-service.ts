import klineRepo from '@repos/kline-repo';
import { t_StockKLine } from '@prisma/client';
import commonService from '@services/common-service';

// 缓存保留1小时
const cacheTTL: number = 1 * 60 * 60 * 1000;
// recent 查询 1 分钟
const cacheTTLShort: number = 60 * 1000;


function GetDateStr(mydate: Date): string {
    return mydate.getFullYear().toString()
        + (mydate.getMonth() + 1)
        + mydate.getDate();
}


async function getKLineByCondition(
    startdate: Date,
    enddate: Date,
    stockcode: string,
    period: string,
): Promise<t_StockKLine[]> {
    const cache = require('memory-cache');
    const cacheKey: string = 'klineCon'
        + GetDateStr(startdate) + 'To' + GetDateStr(enddate)
        + '|' + stockcode + '|' + period;
    const cacheresult = cache.get(cacheKey);
    if (cacheresult != null) { return cacheresult; }

    const klines = await klineRepo.getAllbyCondition(startdate, enddate, stockcode, period);

    if (commonService.checkCache()) {
        cache.put(cacheKey, klines, cacheTTL);
    }

    return klines;
}


async function getKLineByCode(
    stockcode: string,
    period: string,
): Promise<t_StockKLine[]> {
    const cache = require('memory-cache');
    const cacheKey: string = 'klineCode|' + stockcode + '|' + period;
    const cacheresult = cache.get(cacheKey);
    if (cacheresult != null) { return cacheresult; }

    const klines = await klineRepo.getAllbyCode(stockcode, period);

    if (commonService.checkCache()) {
        cache.put(cacheKey, klines, cacheTTL);
    }

    return klines;
}


async function getKLineRecent(
    stockcode: string,
    period: string,
    count: number,
): Promise<t_StockKLine[]> {
    const cache = require('memory-cache');
    const cacheKey: string = 'klineRecent|' + stockcode + '|' + period + '|' + count;
    const cacheresult = cache.get(cacheKey);
    if (cacheresult != null) { return cacheresult; }

    const klines = await klineRepo.getRecent(stockcode, period, count);

    if (commonService.checkCache()) {
        cache.put(cacheKey, klines, cacheTTLShort);
    }

    return klines;
}


export default {
    getKLineByCondition,
    getKLineByCode,
    getKLineRecent,
} as const;
