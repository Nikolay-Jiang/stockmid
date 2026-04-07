import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';
import simService from '@services/simtrade';

const router = Router();
const { OK } = StatusCodes;

/**
 * Find W patterns for a given end date with evaluation
 */
router.get('/findw/:endday', async (req: Request, res: Response) => {
    const { endday } = req.params;
    const result = await simService.evaluateFindW(endday);
    if (result == null) { return res.status(OK).end("not find"); }
    return res.status(OK).json(result);
});

/**
 * Find W online (today) and save predictions to DB with notifications
 */
router.get('/findwon/', async (req: Request, res: Response) => {
    const result = await simService.findAndSaveWOnline();
    if (result == null) { return res.status(OK).end("not find"); }
    return res.status(OK).json(result);
});

/**
 * Find YZM patterns for a given end date with evaluation
 */
router.get('/findyzm/:endday', async (req: Request, res: Response) => {
    const { endday } = req.params;
    const result = await simService.evaluateFindYZM(endday);
    if (result == null) { return res.status(OK).end("not find"); }
    return res.status(OK).json(result);
});

/**
 * Find YZM online (today) and save predictions to DB
 */
router.get('/findyzmon/', async (req: Request, res: Response) => {
    const result = await simService.findAndSaveYZMOnline();
    if (result == null) { return res.status(OK).end("not find"); }
    return res.status(OK).end("accomplish");
});

/**
 * Find YZM for a specific day and save predictions to DB
 */
router.get('/findyzmonbyday/:endday', async (req: Request, res: Response) => {
    const { endday } = req.params;
    const result = await simService.findAndSaveYZMByDay(endday);
    if (result == null) { return res.status(OK).end("not find"); }
    return res.status(OK).end("accomplish");
});

export default router;
