import { PrismaClient, t_StockNameList } from '@prisma/client'
const prisma = new PrismaClient();


/**
 * Get one
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

/**
 * Get all stockName.
 * 
 * @returns 
 */
 async function getAll(): Promise<t_StockNameList[]> {
    return await prisma.t_StockNameList.findMany();
}


// Export default
export default {
    getOne,
    getAll
} as const;
