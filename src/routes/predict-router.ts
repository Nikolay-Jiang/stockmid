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
    backtestw: '/becktestw/:startday/:evalnumber',
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

/**
 * BackTest predict.
 */
router.get(p.backtestw, async (req: Request, res: Response) => {
    const { startday, evalnumber } = req.params;
    if (startday == undefined || startday == "") { throw new ParamMissingError(); }
    var startdate = new Date(startday);
    var evalTmp = 0.4
    if (evalnumber != undefined || evalnumber != "") { evalTmp = Number(evalnumber); }
    var predicts = await predictService.getPredictByDay(startdate, evalTmp);

    var Wpredicts = predicts.filter(x => x.Type == "W");
    if (Wpredicts.length == 0) { return res.end() }


    var iSumDayDiff = 0;
    var iDayDiffAvg = 0;
    var iMiniBenfit = 100;
    var iCountGood = 0;
    var sWText = "";
    Wpredicts.forEach(function (item) {
        if (item.Type == "W" && item.isGood) {
            iSumDayDiff += item.MaxDayDiff;
            iCountGood++;
            if (item.evalprice < iMiniBenfit) { iMiniBenfit = item.evalprice; }
        }
    })

    iDayDiffAvg = parseInt((iSumDayDiff / iCountGood).toFixed(2))
    var iStatusGood = (iCountGood / Wpredicts.length * 100).toFixed(2);

    sWText = `共有W数据${Wpredicts.length}条,其中获益${iCountGood}条，获益比${iStatusGood}%;平均获益时间：${iDayDiffAvg}天，最低获益金额：${iMiniBenfit}元`;
    console.log(iSumDayDiff, iCountGood, iDayDiffAvg)



    return res.status(OK).json({ sWText });

});


// Export default
export default router;
