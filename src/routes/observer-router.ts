import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';

import { GetUserID, GetUserIDByHeader } from './middleware';
import observerService from '@services/observer-service';
import { ParamMissingError } from '@shared/errors';



// Constants
const router = Router();
const { CREATED, OK } = StatusCodes;

// Paths
export const p = {
    get: '/all/',
    gettst: 'all2/:test',
    add: '/add/',
    update: '/update',
    delete: '/delete/:stockcode/',
} as const;



/**
 * Get all observers.
 */
router.get(p.get, async (req: Request, res: Response) => {
    const { authorization } = req.headers;
    if (authorization == undefined || authorization == "") { throw new ParamMissingError(); }
    var userid = await GetUserIDByHeader(String(authorization));
    const observers = await observerService.getAll(userid);
    return res.status(OK).json({ observers });
});

router.get(p.gettst, async (req: Request, res: Response) => {
    const { authorization } = req.headers;
    const { authinfo } = req.body;
    console.log(authorization, authinfo);
    if (authorization == undefined || authorization == "") { throw new ParamMissingError(); }

    var userid = await GetUserIDByHeader(String(authorization));
    const observers = await observerService.getAll(userid);
    return res.status(OK).json({ observers });
});


/**
 * Add one observer.
 */
router.post(p.add, async (req: Request, res: Response) => {
    const { authorization } = req.headers;
    const { observer } = req.body;
    // Check param
    if (!observer) { throw new ParamMissingError(); }
    var userid = await GetUserIDByHeader(String(authorization));
    observer.UserID = userid;

    // Fetch data
    await observerService.addOne(observer);
    return res.status(CREATED).end();
});


/**
 * Update one observer.
 */
router.put(p.update, async (req: Request, res: Response) => {
    const { observer } = req.body;
    const { authorization } = req.headers;
    // Check param
    if (!observer) { throw new ParamMissingError(); }

    var userid = await GetUserIDByHeader(String(authorization));
    observer.UserID = userid;
    // Fetch data
    await observerService.updateOne(observer);
    return res.status(OK).end();
});


/**
 * Delete one observer.
 */
router.delete(p.delete, async (req: Request, res: Response) => {
    const { authorization } = req.headers;
    const { stockcode } = req.params;
    if (authorization == undefined || authorization == "") { throw new ParamMissingError(); }
    var userid = await GetUserIDByHeader(String(authorization));
    // Check param
    if (!stockcode) { throw new ParamMissingError(); }
    // Fetch data
    await observerService.delete(userid, String(stockcode));
    return res.status(OK).end();
});


// Export default
export default router;
