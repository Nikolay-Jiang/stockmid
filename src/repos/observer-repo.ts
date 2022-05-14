import { GetID } from '@shared/functions';
import { PrismaClient, t_Observer, t_User } from '@prisma/client'
const prisma = new PrismaClient();

/**
 * Get one Observer.
 * 
 * @param userID 
 * @returns 
 */
async function getOne(userID: string, stockcode: string): Promise<t_Observer | null> {
    const observer = await prisma.t_Observer.findFirst({
        where: {
            StockCode: stockcode,
            UserID: userID,
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
 * @param id 
 */
async function persists(id: string, stockcode: string): Promise<boolean> {
    const observer = await prisma.t_Observer.findUnique({
        where: {
            StockCode_UserID: {
                StockCode: stockcode,
                UserID: id
            }
        },
    })
    if (observer != null) {
        return true;
    }
    return false;
}


/**
 * Get all Observer.
 * 
 * @returns 
 */
async function getAll(userID: string): Promise<t_Observer[]> {
    return await prisma.t_Observer.findMany({
        where: {
            UserID: userID
        }
    });
}


/**
 * Add one Observer.
 * 
 * @param observer 
 * @returns 
 */
async function add(observer: t_Observer): Promise<void> {

    const post = await prisma.t_Observer.create({
        data: {
            UserID: observer.UserID,
            StockCode: observer.StockCode,
            Rate: observer.Rate,
            RatePrice: observer.RatePrice,
            TradeVol: observer.TradeVol,
            CreateAt: new Date(),
        },
    })
}


/**
 * Update a Observer.
 * 
 * @param observer 
 * @returns 
 */
async function update(observer: t_Observer): Promise<void> {
    const post = await prisma.t_Observer.update({
        where: {
            StockCode_UserID: {
                StockCode: observer.StockCode,
                UserID: observer.UserID
            }
        },
        data: {
            Rate: observer.Rate,
            RatePrice: observer.RatePrice,
            TradeVol: observer.TradeVol,
            PlanID: observer.PlanID
        },
    })
}


/**
 * Delete one Observer.
 * 
 * @param id 
 * @param stockcode
 * @returns 
 */
async function deleteOne(id: string, stockcode: string): Promise<void> {
    const deleteObserver = await prisma.t_Observer.delete({
        where: {
            StockCode_UserID: {
                StockCode: stockcode,
                UserID: id
            }
        },
    })
}


// Export default
export default {
    getOne,
    persists,
    getAll,
    add,
    update,
    delete: deleteOne,
} as const;
