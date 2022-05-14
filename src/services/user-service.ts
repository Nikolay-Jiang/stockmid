import userRepo from '@repos/user-repo';
import { UserNotFoundError } from '@shared/errors';
import {PrismaClient, t_User} from '@prisma/client'


/**
 * Get all users.
 * 
 * @returns 
 */
function getAll(): Promise<t_User[]> {
    return userRepo.getAll();
}


/**
 * Add one user.
 * 
 * @param user 
 * @returns 
 */
function addOne(user:t_User): Promise<void> {
    return userRepo.add(user);
}


/**
 * Update one user.
 * 
 * @param user 
 * @returns 
 */
async function updateOne(user: t_User): Promise<void> {
    const persists = await userRepo.persists(user.UserID);
    if (!persists) {
        throw new UserNotFoundError();
    }
    return userRepo.update(user);
}


/**
 * Delete a user by their id.
 * 
 * @param id 
 * @returns 
 */
async function deleteOne(id: string): Promise<void> {
    
    const persists = await userRepo.persists(id);
    if (!persists) {
        throw new UserNotFoundError();
    }
    return userRepo.delete(id);
}


// Export default
export default {
    getAll,
    addOne,
    updateOne,
    delete: deleteOne,
} as const;
