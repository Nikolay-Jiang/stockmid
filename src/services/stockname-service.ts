import stocknameRepo from '@repos/stockname-repo';
import { t_StockNameList } from '@prisma/client'
import { StockNotFoundError } from '@shared/errors';



/**
 * getone
 * @param stockcode 
 * @returns 
 */
async function getOne(stockcode: string): Promise<t_StockNameList> {
    const stock = await stocknameRepo.getOne(stockcode);
    if (!stock) {
        throw new StockNotFoundError();
    }
    return stock;
}

/**
 * getall
 * @returns 
 */
 async function getAll(): Promise<t_StockNameList[]> {
    const stocks = await stocknameRepo.getAll();
    if (!stocks) {
        throw new StockNotFoundError();
    }
    return stocks;
}



// Export default
export default {
    getOne,
    getAll,
} as const;
