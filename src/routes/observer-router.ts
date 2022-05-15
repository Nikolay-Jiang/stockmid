import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';

import { GetUserID } from './middleware';
import observerService from '@services/observer-service';
import { ParamMissingError } from '@shared/errors';



// Constants
const router = Router();
const { CREATED, OK } = StatusCodes;

// Paths
export const p = {
    get: '/all/:userid',
    add: '/add/',
    update: '/update',
    delete: '/delete/:stockcode/:userid',
} as const;



/**
 * Get all observers.
 */
router.get(p.get, async (req: Request, res: Response) => {
    const { userid } = req.params;
    const observers = await observerService.getAll(userid);
    return res.status(OK).json({ observers });
});


/**
 * Add one observer.
 */
router.post(p.add, async (req: Request, res: Response) => {
    const { observer } = req.body;
    // Check param
    if (!observer) {
        throw new ParamMissingError();
    }
    // Fetch data
    await observerService.addOne(observer);
    return res.status(CREATED).end();
});


/**
 * Update one observer.
 */
router.put(p.update, async (req: Request, res: Response) => {
    const { observer } = req.body;

    // Check param
    if (!observer) {
        throw new ParamMissingError();
    }
    observer.UserID = await GetUserID(req);
    // Fetch data
    await observerService.updateOne(observer);
    return res.status(OK).end();
});


/**
 * Delete one observer.
 */
router.delete(p.delete, async (req: Request, res: Response) => {
    const { stockcode,userid } = req.params;

    // Check param
    if (!stockcode) {
        throw new ParamMissingError();
    }
    // Fetch data
    await observerService.delete(userid, String(stockcode));
    return res.status(OK).end();
});


// Export default
export default router;
