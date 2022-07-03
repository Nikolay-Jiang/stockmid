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
    // var testresults = predicts.filter(x => x.CatchRsi7 >= 60 && x.CatchRsi7 <= 70 && x.CatchRsi14 >= 60 && x.CatchRsi14 <= 70);
    // console.log(testresults.length)
    // return res.status(OK).json({ testresults, statsGood });
    return res.status(OK).json({ predicts, statsGood });
});



// Export default
export default router;
