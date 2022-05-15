import observerRepo from '@repos/observer-repo';
import { UserNotFoundError } from '@shared/errors';
import { t_Observer } from '@prisma/client'


/**
 * Get all observers.
 * 
 * @returns 
 */
function getAll(userID: string): Promise<t_Observer[]> {
    return observerRepo.getAll(userID);
}


/**
 * Add one observer.
 * 
 * @param observer 
 * @returns 
 */
function addOne(observer: t_Observer): Promise<void> {
    return observerRepo.add(observer);
}


/**
 * Update one user.
 * 
 * @param observer 
 * @returns 
 */
async function updateOne(observer: t_Observer): Promise<void> {
    const persists = await observerRepo.persists(observer.UserID, observer.StockCode);
    if (!persists) {
        throw new UserNotFoundError();
    }
    return observerRepo.update(observer);
}


/**
 * Delete a observer by their id.
 * 
 * @param userID
 * @param stockcode 
 * @returns 
 */
async function deleteOne(userID: string, stockcode: string): Promise<void> {

    const persists = await observerRepo.persists(userID, stockcode);
    if (!persists) {
        throw new UserNotFoundError();
    }
    return observerRepo.delete(userID, stockcode);
}


// Export default
export default {
    getAll,
    addOne,
    updateOne,
    delete: deleteOne,
} as const;

