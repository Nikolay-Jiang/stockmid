import daylogRepo from '@repos/daylog-repo';
import { t_StockDayLog } from '@prisma/client'



/**
 * getDaylogByCondition
 * @param reportday 
 * @returns 
 */
async function getDaylogByCondition(startdate: Date, enddate: Date, stockcode: string): Promise<t_StockDayLog[]> {
    return await daylogRepo.getDaylogbyCondition(startdate, enddate, stockcode);
}


// Export default
export default {
    getDaylogByCondition,
} as const;
