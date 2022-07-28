import dayrptRepo from '@repos/dayRpt-repo';
import { t_StockDayReport } from '@prisma/client'


/**
 * getDayrptByCode
 * @param stockcode  
 * @returns 
 */
async function getDayrptByCode(stockcode: string): Promise<t_StockDayReport[]> {
    const dayrpts = await dayrptRepo.getAllbyCode(stockcode);
    return dayrpts
}


/**
 * getDayrptByrptday
 * @param reportday 
 * @returns 
 */
async function getDayrptByReportDay(reportday: Date): Promise<t_StockDayReport[]> {
    var cache = require('memory-cache');
    //判断是否存在缓存
    var cacheKey: string = "rpt" + GetDateStr(reportday);
    var cacheresult = cache.get(cacheKey);
    if (cacheresult != null) {
        return cacheresult;
    }

    const dayrpts = await dayrptRepo.getAllbyReportDay(reportday);
    cache.put(cacheKey, dayrpts, 3600000);
    return dayrpts
}

function GetDateStr(mydate: Date): string {
    var sResult: string = mydate.getFullYear().toString() + (mydate.getMonth() + 1) + mydate.getDate();
    return sResult;
}


/**
 * getDayrptByrptday
 * @param reportday 
 * @returns 
 */
async function getDayrptByReportDay2(startdate: Date, enddate: Date): Promise<t_StockDayReport[]> {
    var cache = require('memory-cache');
    var cacheKey: string = "rpt2" + GetDateStr(startdate) + "To" + GetDateStr(enddate);
    var cacheresult = cache.get(cacheKey);
    if (cacheresult != null) { return cacheresult; }

    const dayrpts = await dayrptRepo.getAllbyReportDay2(startdate, enddate);
    cache.put(cacheKey, dayrpts, 3600000);

    return dayrpts
}


/**
 * getDayrptByCondition
 * @param reportday 
 * @returns 
 */
async function getDayrptByCondition(startdate: Date, enddate: Date, stockcode: string): Promise<t_StockDayReport[]> {
    var cache = require('memory-cache');
    var cacheKey: string = "rptCon" + GetDateStr(startdate) + "To" + GetDateStr(enddate) + "|" + stockcode;
    var cacheresult = cache.get(cacheKey);
    if (cacheresult != null) { return cacheresult; }

    const dayrpts = await dayrptRepo.getAllbyCondition(startdate, enddate, stockcode);
    cache.put(cacheKey, dayrpts, 3600000);
    return dayrpts
}

async function getdayRptCountByDayAfter(endday: Date, stockcode: string, iCount: number): Promise<t_StockDayReport[]> {
    var cache = require('memory-cache');
    var cacheKey: string = "rptCountAF" + GetDateStr(endday) + "|" + stockcode + "|" + iCount;
    var cacheresult = cache.get(cacheKey);
    if (cacheresult != null) { return cacheresult; }

    const dayrpts = await dayrptRepo.getdayRptCountByDayAfter(endday, stockcode, iCount);
    cache.put(cacheKey, dayrpts, 3600000);
    return dayrpts
}

async function getdayRptCountByDayBefore(endday: Date, stockcode: string, iCount: number): Promise<t_StockDayReport[]> {
    var cache = require('memory-cache');
    var cacheKey: string = "rptCountBE" + GetDateStr(endday) + "|" + stockcode + "|" + iCount;
    var cacheresult = cache.get(cacheKey);
    if (cacheresult != null) { return cacheresult; }

    const dayrpts = await dayrptRepo.getdayRptCountByDayBefore(endday, stockcode, iCount);
    cache.put(cacheKey, dayrpts, 3600000);
    return dayrpts
}



/**
 * getone
 * @param reportday 
 * @param stockcode
 * @returns 
 */
async function getone(reportday: Date, stockcode: string): Promise<t_StockDayReport | null> {

    return await dayrptRepo.getOne(reportday, stockcode);
}



// Export default
export default {
    getDayrptByCode, getDayrptByReportDay, getDayrptByCondition,GetDateStr,
    getone, getDayrptByReportDay2, getdayRptCountByDayAfter, getdayRptCountByDayBefore

} as const;
