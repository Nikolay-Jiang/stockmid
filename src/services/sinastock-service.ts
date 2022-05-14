import sinastockRepo, { Stock } from '@repos/sinastock-repo';

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
 * getstockList
 * @param stockcodes 用',' 分割多个
 * @returns 
 */
async function getstockList(stockcodes: string): Promise<Stock[]> {
    const stocks = await sinastockRepo.GetStockList(stockcodes);
    return stocks
}

// Export default
export default {
    getstockList,
    getone

} as const;
