import StatusCodes from 'http-status-codes';
import qwenService from '@services/qwen-service';
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
    const dscontent = await qwenService.getds (stockcode);
    return res.status(OK).json({ dscontent });
});

export default router;