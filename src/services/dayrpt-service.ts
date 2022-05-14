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
    const dayrpts = await dayrptRepo.getAllbyReportDay(reportday);
    return dayrpts
}

/**
 * getDayrptByCondition
 * @param reportday 
 * @returns 
 */
async function getDayrptByCondition(startdate: Date, enddate: Date, stockcode: string): Promise<t_StockDayReport[]> {
    return await dayrptRepo.getAllbyCondition(startdate, enddate, stockcode);
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
    getDayrptByCode, getDayrptByReportDay, getDayrptByCondition,
    getone

} as const;