import sinastockRepo, { Notice, Stock } from '@repos/sinastock-repo';
import { t_StockDayReport } from '@prisma/client'

/**
 * getonestockCurrrentStatus
 * @param stockcode  
 * @returns 
 */
async function getone(stockcode: string): Promise<Stock> {
    const stock = await sinastockRepo.GetStockOne(stockcode);
    return stock
}

/**
 * 获取公告
 */
async function getnotice(stockcode: string): Promise<Notice[]> {
    const noticelist = await sinastockRepo.GetStockNotice(stockcode);
    return noticelist
}

/**
 * 补日报
 */
async function getdayrpt(startdate: Date, enddate: Date, stockcode: string): Promise<t_StockDayReport[]> {
    const dayrpts = await sinastockRepo.GetStockDayRpt(startdate, enddate, stockcode);
    return dayrpts;
}

/**
 * getstockList
 * @param stockcodes 用',' 分割多个
 * @returns 
 */
async function getstockList(stockcodes: string): Promise<Stock[]> {
    const stocks = await sinastockRepo.GetStockList(stockcodes);
    return stocks
}

/**
 * 判断日期是否为节假日
 */
async function isHoliday(checkDay: Date) {
    return await sinastockRepo.isHoliday(checkDay);
}

// Export default
export default {
    getstockList, getnotice,
    getone, getdayrpt, isHoliday

} as const;
