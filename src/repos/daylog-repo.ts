import { PrismaClient, t_StockDayLog } from '@prisma/client'
const prisma = new PrismaClient();


/**
 * Get all condition.
 * 
 * @returns 
 */
 async function getDaylogbyCondition(startdate:Date,enddate:Date,stockcode:string): Promise<t_StockDayLog[]> {
    return await prisma.t_StockDayLog.findMany({
        where:{
            StockCode:stockcode,
            SearchTime:{
                gte:startdate,
                lt:enddate
            }
        }
    });
}




// Export default
export default {
    getDaylogbyCondition
} as const;
