import tencentstockRepo, { Notice, Stock } from '@repos/tencentstock-repo';
import { t_StockDayReport } from '@prisma/client'

/**
 * getonestockCurrrentStatus
 * @param stockcode  
 * @returns 
 */
async function getone(stockcode: string): Promise<Stock> {
    const stock = await tencentstockRepo.GetStockOne(stockcode);
    return stock
}

/**
 * 获取公告
 */
async function getnotice(stockcode: string): Promise<Notice[]> {
    const noticelist = await tencentstockRepo.GetStockNotice(stockcode);
    return noticelist
}

/**
 * 补日报
 */
async function getdayrpt(startdate: Date, enddate: Date, stockcode: string): Promise<t_StockDayReport[]> {
    const dayrpts = await tencentstockRepo.GetStockDayRpt(startdate, enddate, stockcode);
    return dayrpts;
}

/**
 * getstockList
 * @param stockcodes 用',' 分割多个
 * @returns 
 */
async function getstockList(stockcodes: string): Promise<Stock[]> {
    const stocks = await tencentstockRepo.GetStockList(stockcodes);
    return stocks
}

/**
 * 判断日期是否为节假日
 */
async function isHoliday(checkDay: Date) {
    if (checkDay.getDay()==6||checkDay.getDay()==0) {//周六 周日情况
        return true
    }
    return await tencentstockRepo.isHoliday(checkDay);
}

// Export default
export default {
    getstockList, getnotice,
    getone, getdayrpt, isHoliday

} as const;
