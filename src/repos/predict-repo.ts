/* eslint-disable max-len */
import { GetID } from '@shared/functions';
import { PrismaClient, t_Predict } from '@prisma/client'
const prisma = new PrismaClient();



/**
 * Add one user.
 * 
 * @param mPredict 
 * @returns 
 */
async function add(mPredict: t_Predict): Promise<void> {

    const post = await prisma.t_Predict.create({
        data: {
            PredictKey: GetID("PreID"),
            StockCode: mPredict.StockCode,
            PredictTime: mPredict.PredictTime,
            Type: mPredict.Type,
            CurrentPrice: mPredict.CurrentPrice,
            RSI7: mPredict.RSI7,
            RSI14: mPredict.RSI14,
            BackTest: mPredict.BackTest,
            Memo: mPredict.Memo
        },
    })
}




/**
 * Get all DayRepor.
 * 
 * @returns 
 */
async function getAll(): Promise<t_Predict[]> {
    return await prisma.t_Predict.findMany({
    });
}


/**
 * Get all PredictDataByPredictTime.
 * 
 * @returns 
 */
async function getAllbyPredictTime(startdate: Date, enddate: Date): Promise<t_Predict[]> {
    return await prisma.t_Predict.findMany({
        where: {
            PredictTime: {
                gte: startdate,
                lt: enddate
            },
        }
    });
}





/**
 * Get all condition.
 * 
 * @returns 
 */
async function getAllbyCondition(startdate: Date, enddate: Date, stockcode: string): Promise<t_Predict[]> {
    return await prisma.t_Predict.findMany({
        where: {
            StockCode: stockcode,
            PredictTime: {
                gte: startdate,
                lte: enddate
            }
        }
    });
}




// Export default
export default {
    add,
    getAll,
    getAllbyPredictTime,
    getAllbyCondition
} as const;
