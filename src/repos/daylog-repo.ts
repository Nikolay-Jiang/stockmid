import { t_StockDayLog } from '@prisma/client'
import prisma from '@repos/prisma';
import logger from 'jet-logger';


/**
 * Get all condition.
 * 
 * @returns 
 */
async function getDaylogbyCondition(startdate: Date, enddate: Date, stockcode: string): Promise<t_StockDayLog[]> {
    var results = await prisma.t_StockDayLog.findMany({
        where: {
            StockCode: stockcode,
            SearchTime: {
                gte: startdate,
                lt: enddate
            }
        }
    });

    results.map((item) => ({ ...item, SearchTime: item.SearchTime?.setHours(item.SearchTime.getHours() - 8) }));

    // logger.info(myresults)

    return results;

}




// Export default
export default {
    getDaylogbyCondition
} as const;
