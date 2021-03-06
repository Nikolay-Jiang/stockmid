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
    backtest: '/backtest/:startday/:evalnumber',
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
router.get(p.backtest, async (req: Request, res: Response) => {
    const { startday, evalnumber } = req.params;
    if (startday == undefined || startday == "") { throw new ParamMissingError(); }
    var startdate = new Date(startday);
    var evalTmp = 0.4
    if (evalnumber != undefined || evalnumber != "") { evalTmp = Number(evalnumber); }
    var predicts = await predictService.getPredictByDay(startdate, evalTmp);

    var Wpredicts = predicts.filter(x => x.Type == "W");
    var YZMpredicts = predicts.filter(x => x.Type == "YZM");
    var WText = "";
    var YZMText = "";
    if (Wpredicts.length > 0) {
        var iSumDayDiff = 0;
        var iDayDiffAvg = 0;
        var iMiniBenfit = 100;
        var iCountGood = 0;
        var iStatusGoodW="0";
        Wpredicts.forEach(function (item) {
            if (item.isGood) {
                iSumDayDiff += item.MaxDayDiff;
                iCountGood++;
                if (item.evalprice < iMiniBenfit) { iMiniBenfit = item.evalprice; }
            }
        })

        if (iCountGood>0) {
            iDayDiffAvg = parseInt((iSumDayDiff / iCountGood).toFixed(2))
            iStatusGoodW = (iCountGood / Wpredicts.length * 100).toFixed(2);    
        }
        
        if (iCountGood==0) {iMiniBenfit=0;}

        WText = `??????W??????${Wpredicts.length}???,????????????${iCountGood}???????????????${iStatusGoodW}%;?????????????????????${iDayDiffAvg}???????????????????????????${iMiniBenfit}???`;
        // console.log(iSumDayDiff, iCountGood, iDayDiffAvg)

    }


    if (YZMpredicts.length > 0) {
        var iSumDayDiff = 0;
        var iDayDiffAvg = 0;
        var iMiniBenfit = 100;
        var iCountGood = 0;
        var iStatusGoodYZM = "0";

        YZMpredicts.forEach(function (item) {
            if (item.isGood) {
                iSumDayDiff += item.MaxDayDiff;
                iCountGood++;
                if (item.evalprice < iMiniBenfit) { iMiniBenfit = item.evalprice; }
            }
        })

        if (iCountGood > 0) {
            iDayDiffAvg = parseInt((iSumDayDiff / iCountGood).toFixed(2))
            iStatusGoodYZM = (iCountGood / YZMpredicts.length * 100).toFixed(2);
        }

        if (iCountGood==0) {iMiniBenfit=0;}


        YZMText = `??????YZM??????${YZMpredicts.length}???,????????????${iCountGood}???????????????${iStatusGoodYZM}%;?????????????????????${iDayDiffAvg}???????????????????????????${iMiniBenfit}???`;
        console.log(iSumDayDiff, iCountGood, iDayDiffAvg)
    }

    return res.status(OK).json({ WText, YZMText });

});


// Export default
export default router;
