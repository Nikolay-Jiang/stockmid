import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';

import stocknameService from '@services/stockname-service';


// Constants
const router = Router();
const { CREATED, OK } = StatusCodes;

// Paths
export const p = {
    get: '/all',
    getone: '/getone/:stockcode',
} as const;



/**
 * Get all stockname.
 */
router.get(p.get, async (req: Request, res: Response) => {
    const stocknamelist = await stocknameService.getAll();
    return res.status(OK).json({ stocknamelist });
});


/**
 * Get one.
 */
 router.get(p.getone, async (req: Request, res: Response) => {
    const { stockcode } = req.params;
    const stockname = await stocknameService.getOne(stockcode);
    return res.status(OK).json({ stockname });
});



// Export default
export default router;
