import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';

import predictService, { statsGood } from '@services/predict-service';
import { ParamMissingError } from '@shared/errors';




// Constants
const router = Router();
const { CREATED, OK } = StatusCodes;

// Paths
export const p = {
    get: '/getallbyday/:startday/:endday',
    getbyday: '/getbyday/:startday/:evalnumber',
} as const;



/**
 * Get all predict.
 */
router.get(p.get, async (req: Request, res: Response) => {
    const { startday, endday } = req.params;
    if (startday == undefined || startday == "") { throw new ParamMissingError(); }
    var startdate = new Date(startday);
    var enddate = new Date(endday);
    const predicts = await predictService.getPredictByPredictTime(startdate, enddate);
    return res.status(OK).json({ predicts });
});

/**
 * Get all predict By Day.
 */
router.get(p.getbyday, async (req: Request, res: Response) => {
    const { startday, evalnumber } = req.params;
    if (startday == undefined || startday == "") { throw new ParamMissingError(); }
    var startdate = new Date(startday);
    var evalTmp = 0.4
    if (evalnumber != undefined || evalnumber != "") { evalTmp = Number(evalnumber); }


    const predicts = await predictService.getPredictByDay(startdate, evalTmp);
    return res.status(OK).json({ predicts, statsGood });
});



// Export default
export default router;
