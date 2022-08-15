import dayrptRepo from '@repos/dayRpt-repo';
import { t_StockDayReport } from '@prisma/client'
import commonService from '@services/common-service';


const cacheTTL: number = 300000
const cacheTTLShort: number = 60000
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

    if (commonService.checkCache()) {
        cache.put(cacheKey, dayrpts, cacheTTL);
    }

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

    if (commonService.checkCache()) {
        cache.put(cacheKey, dayrpts, cacheTTL);
    }

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

    if (commonService.checkCache()) {
        cache.put(cacheKey, dayrpts, cacheTTL);
    }

    return dayrpts
}

async function getdayRptCountByDayAfter(endday: Date, stockcode: string, iCount: number): Promise<t_StockDayReport[]> {
    var cache = require('memory-cache');
    var cacheKey: string = "rptCountAF" + GetDateStr(endday) + "|" + stockcode + "|" + iCount;
    var cacheresult = cache.get(cacheKey);
    if (cacheresult != null) { return cacheresult; }

    const dayrpts = await dayrptRepo.getdayRptCountByDayAfter(endday, stockcode, iCount);

    if (commonService.checkCache()) {
        cache.put(cacheKey, dayrpts, cacheTTLShort);
    }

    return dayrpts
}

async function getdayRptCountByDayBefore(endday: Date, stockcode: string, iCount: number): Promise<t_StockDayReport[]> {
    var cache = require('memory-cache');
    var cacheKey: string = "rptCountBE" + GetDateStr(endday) + "|" + stockcode + "|" + iCount;
    var cacheresult = cache.get(cacheKey);
    if (cacheresult != null) { return cacheresult; }

    const dayrpts = await dayrptRepo.getdayRptCountByDayBefore(endday, stockcode, iCount);

    if (commonService.checkCache()) {
        cache.put(cacheKey, dayrpts, cacheTTLShort);
    }

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
    getDayrptByCode, getDayrptByReportDay, getDayrptByCondition, GetDateStr,
    getone, getDayrptByReportDay2, getdayRptCountByDayAfter, getdayRptCountByDayBefore

} as const;
