import StatusCodes from 'http-status-codes';
import qwenService from '@services/qwen-service';
import { Request, Response, Router } from 'express';

// Constants
const router = Router();
const { OK } = StatusCodes;

// Paths
export const p = {
    getds: '/callds/:stockcode',
} as const;

/**
 * Get AI analysis report for a stock.
 * Returns cached report if available, or triggers async generation.
 */
router.get(p.getds, async (req: Request, res: Response) => {
    const { stockcode } = req.params;
    const content = await qwenService.getds(stockcode);
    const dscontent = content;
    if (content !== null) {
        return res.status(OK).json({ dscontent, status: 'ready' });
    }
    return res.status(OK).json({ dscontent: '报告正在生成，请稍候', status: 'generating' });
});

export default router;
