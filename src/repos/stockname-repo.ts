import { PrismaClient, t_StockNameList } from '@prisma/client'
const prisma = new PrismaClient();


/**
 * Get all condition.
 * 
 * @returns 
 */
async function getOne(stockcode: string): Promise<t_StockNameList | null> {
    return await prisma.t_StockNameList.findUnique({
        where: {
            StockCode: stockcode,
        }
    });
}


// Export default
export default {
    getOne
} as const;
