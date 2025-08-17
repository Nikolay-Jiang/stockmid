import StatusCodes from 'http-status-codes';
import deepseekService from '@services/deepseek-service';
import { Request, Response, Router } from 'express';

// Constants
const router = Router();
const { CREATED, OK } = StatusCodes;

// Paths
export const p = {
    getds: '/callds/:stockcode',
    
} as const;

/**
 * Get all dayrpt by day.
 */
router.get(p.getds, async (req: Request, res: Response) => {

    const { stockcode } = req.params;
    const dscontent = await deepseekService.getds (stockcode);
    return res.status(OK).json({ dscontent });
});

export default router;