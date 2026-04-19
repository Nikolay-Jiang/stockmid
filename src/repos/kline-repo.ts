import { PrismaClient, t_StockKLine } from '@prisma/client';

const prisma = new PrismaClient();


async function getAllbyCondition(
    startdate: Date,
    enddate: Date,
    stockcode: string,
    period: string,
): Promise<t_StockKLine[]> {
    return await prisma.t_StockKLine.findMany({
        where: {
            StockCode: stockcode,
            Period: period,
            TradeTime: {
                gte: startdate,
                lte: enddate,
            },
        },
        orderBy: { TradeTime: 'asc' },
    });
}


async function getAllbyCode(
    stockcode: string,
    period: string,
): Promise<t_StockKLine[]> {
    return await prisma.t_StockKLine.findMany({
        where: {
            StockCode: stockcode,
            Period: period,
        },
        orderBy: { TradeTime: 'asc' },
    });
}


async function getRecent(
    stockcode: string,
    period: string,
    count: number,
): Promise<t_StockKLine[]> {
    return await prisma.t_StockKLine.findMany({
        where: {
            StockCode: stockcode,
            Period: period,
        },
        orderBy: { TradeTime: 'desc' },
        take: count,
    });
}


export default {
    getAllbyCondition,
    getAllbyCode,
    getRecent,
} as const;
