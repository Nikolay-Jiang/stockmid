import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';
import simService from '@services/simtrade';

// Constants
const router = Router();
const { OK } = StatusCodes;

// Paths
export const p = {
    statistics: '/statistics/:startday/:endday/:stockcode',
    findW: '/findw/:endday',
    findwOnline: '/findwon/',
    findyzm: '/findyzm/:endday',
    findyzmon: '/findyzmon/',
    findyzmonbyday: '/findyzmonbyday/:endday',
    simtradebypredict: '/simfrompredict/:startday',
} as const;

/**
 * Simulate trading based on predictions for a given start day
 */
router.get(p.simtradebypredict, async (req: Request, res: Response) => {
    const { startday } = req.params;
    const result = await simService.simulateFromPredictions(startday);
    if (result.total == 0) { return res.status(OK).end("not find"); }
    return res.status(OK).end("page end!");
});

/**
 * Run statistics analysis for a stock over a date range
 */
router.get(p.statistics, async (req: Request, res: Response) => {
    const { startday, endday, stockcode } = req.params;
    const result = await simService.runStatistics(startday, endday, stockcode);
    if (result == null) { return res.status(OK).end(); }
    return res.status(OK).json(result);
});

/**
 * Find W patterns for a given end date with evaluation
 */
router.get(p.findW, async (req: Request, res: Response) => {
    const { endday } = req.params;
    const result = await simService.evaluateFindW(endday);
    if (result == null) { return res.status(OK).end("not find"); }
    return res.status(OK).json(result);
});

/**
 * Find YZM patterns for a given end date with evaluation
 */
router.get(p.findyzm, async (req: Request, res: Response) => {
    const { endday } = req.params;
    const result = await simService.evaluateFindYZM(endday);
    if (result == null) { return res.status(OK).end("not find"); }
    return res.status(OK).json(result);
});

/**
 * Find YZM online (today) and save predictions to DB
 */
router.get(p.findyzmon, async (req: Request, res: Response) => {
    const result = await simService.findAndSaveYZMOnline();
    if (result == null) { return res.status(OK).end("not find"); }
    return res.status(OK).end("accomplish");
});

/**
 * Find YZM for a specific day and save predictions to DB
 */
router.get(p.findyzmonbyday, async (req: Request, res: Response) => {
    const { endday } = req.params;
    const result = await simService.findAndSaveYZMByDay(endday);
    if (result == null) { return res.status(OK).end("not find"); }
    return res.status(OK).end("accomplish");
});

/**
 * Find W online (today) and save predictions to DB with notifications
 */
router.get(p.findwOnline, async (req: Request, res: Response) => {
    const result = await simService.findAndSaveWOnline();
    if (result == null) { return res.status(OK).end("not find"); }
    return res.status(OK).json(result);
});

// Export default
export default router;
