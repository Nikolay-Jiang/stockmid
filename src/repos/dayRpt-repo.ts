import { PrismaClient, t_StockDayReport } from '@prisma/client'
const prisma = new PrismaClient();

/**
 * Get one Observer.
 * 
 * @param reportday 
 * @param stockcode
 * @returns 
 */
async function getOne(reportday: Date, stockcode: string): Promise<t_StockDayReport | null> {
    const observer = await prisma.t_StockDayReport.findFirst({
        where: {
            StockCode: stockcode,
            ReportDay: reportday,
        },
    })
    if (observer != null) {
        return observer
    }

    return null;
}


/**
 * See if a Observer with the given id exists.
 * 
 * @param reportday 
 */
async function persists(reportday: Date, stockcode: string): Promise<boolean> {
    const stockrpt = await prisma.t_StockDayReport.findUnique({
        where: {
            StockCode_ReportDay: {
                StockCode: stockcode,
                ReportDay:reportday
            }
        },
    })
    if (stockrpt != null) {
        return true;
    }
    return false;
}


/**
 * Get all DayRepor.
 * 
 * @returns 
 */
async function getAll(): Promise<t_StockDayReport[]> {
    return await prisma.t_StockDayReport.findMany({
    });
}

/**
 * Get all DayReportByStockCode.
 * 
 * @returns 
 */
 async function getAllbyCode(stockcode:string): Promise<t_StockDayReport[]> {
    return await prisma.t_StockDayReport.findMany({
        where:{
            StockCode:stockcode,
        }
    });
}

/**
 * Get all DayReportByStockCode.
 * 
 * @returns 
 */
 async function getAllbyReportDay(reportday:Date): Promise<t_StockDayReport[]> {
    return await prisma.t_StockDayReport.findMany({
        where:{
            ReportDay:reportday,
        }
    });
}

/**
 * Get all condition.
 * 
 * @returns 
 */
 async function getAllbyCondition(startdate:Date,enddate:Date,stockcode:string): Promise<t_StockDayReport[]> {
    return await prisma.t_StockDayReport.findMany({
        where:{
            StockCode:stockcode,
            ReportDay:{
                gte:startdate,
                lt:enddate
            }
        }
    });
}




// Export default
export default {
    getOne,
    persists,
    getAll,
    getAllbyCode,
    getAllbyReportDay,
    getAllbyCondition
} as const;
