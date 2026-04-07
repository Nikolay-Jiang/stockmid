import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';
import simService from '@services/simtrade';

const router = Router();
const { OK } = StatusCodes;

/**
 * Simulate trading based on predictions for a given start day
 */
router.get('/simfrompredict/:startday', async (req: Request, res: Response) => {
    const { startday } = req.params;
    const result = await simService.simulateFromPredictions(startday);
    if (result.total == 0) { return res.status(OK).end("not find"); }
    return res.status(OK).end("page end!");
});

/**
 * Run statistics analysis for a stock over a date range
 */
router.get('/statistics/:startday/:endday/:stockcode', async (req: Request, res: Response) => {
    const { startday, endday, stockcode } = req.params;
    const result = await simService.runStatistics(startday, endday, stockcode);
    if (result == null) { return res.status(OK).end(); }
    return res.status(OK).json(result);
});

export default router;
