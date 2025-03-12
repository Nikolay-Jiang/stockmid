import StatusCodes from 'http-status-codes';
import deepseekService from '@services/deepseek-service';
import { Request, Response, Router } from 'express';

// Constants
const router = Router();
const { CREATED, OK } = StatusCodes;

// Paths
export const p = {
    getds: '/callds/:stockcodes',
    
} as const;

/**
 * Get all dayrpt by day.
 */
router.get(p.getds, async (req: Request, res: Response) => {

    const { stockcodes } = req.params;
    const prompt="请结合已有数据，对"+stockcodes+"进行财务基本面分析"

    const dscontent = await deepseekService.getds (prompt);
    return res.status(OK).json({ dscontent });
});

export default router;