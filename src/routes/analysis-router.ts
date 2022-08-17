import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';
import dayrptService from '@services/dayrpt-service';
import sinaService from '@services/sinastock-service';

import analService from '@services/analysis-service';
import { Prisma } from '@prisma/client';
import commonService from '@services/common-service';


// Constants
const router = Router();
const { CREATED, OK } = StatusCodes;


// Paths
export const p = {
    getbyconditicon: '/allbycondition/:startday/:endday/:stockcode',
    getbestrate: '/bestrate/:stockcode/:daycount'
} as const;


/**
 * Get all dayrpt by condition.
 */
router.get(p.getbyconditicon, async (req: Request, res: Response) => {

    const { startday, endday, stockcode } = req.params;
    var begindate: Date = new Date(startday);
    var enddate: Date = new Date(endday);
    var todaydate: Date = new Date();
    //修正UTC问题
    if (begindate.getHours() == 0) {
        begindate.setHours(begindate.getHours() + 8)
    }
    if (enddate.getHours() == 0) {
        enddate.setHours(enddate.getHours() + 8)
    }

    var dayrpts = await dayrptService.getDayrptByCondition(begindate, enddate, stockcode)

    if (dayrpts == null || dayrpts.length == 0) { return res.status(OK).end(); }
    var dayrptsCopy=[...dayrpts];
    var txtresult: string = ""
    var mStock = await sinaService.getone(stockcode);
    var boll = await analService.bollCalc(dayrptsCopy);
    var rsi = await analService.rsiCalc(dayrptsCopy);

    if (commonService.isSameDay(enddate, todaydate) && Number(mStock.TradingVolume) > 0) {//如果是当日，则把实时数据放入,排除停牌情况
        if (todaydate.getHours() >= 9 && todaydate.getHours() <= 15) {
            var mdayrpttoday = await analService.GetTodayDayRpt(todaydate, stockcode, mStock)

            dayrptsCopy.push(mdayrpttoday);

            let rsiReal = await analService.rsiCalc(dayrptsCopy);

            dayrptsCopy[dayrptsCopy.length - 1].RSI7 = new Prisma.Decimal(rsiReal.rsi7);
            dayrptsCopy[dayrptsCopy.length - 1].RSI14 = new Prisma.Decimal(rsiReal.rsi14);

            console.log("sameday", convertDatetoStr(dayrptsCopy[dayrptsCopy.length - 1].ReportDay), dayrptsCopy.length);
            txtresult += await analService.getRealTxt(mStock, boll, rsiReal, dayrptsCopy);
        }
    }

    //获取振幅数据
    var rateanalysisdata = await analService.GetRateData(dayrptsCopy);
    txtresult += analService.getAnalyTxt(dayrptsCopy, rateanalysisdata, boll, rsi, mStock);

    return res.status(OK).json({ txtresult, rateanalysisdata });
});



/**
 * Get all dayrpt by condition.
 */
router.get(p.getbestrate, async (req: Request, res: Response) => {

    const { daycount, stockcode } = req.params;
    var iDay = Number(daycount);
    var enddate: Date = new Date();
    var begindate: Date = new Date();
    begindate.setDate(enddate.getDate() - iDay);
    console.log(enddate.toDateString(), begindate.toDateString());
    //修正UTC问题
    if (begindate.getHours() == 0) {
        begindate.setHours(begindate.getHours() + 8)
    }
    if (enddate.getHours() == 0) {
        enddate.setHours(enddate.getHours() + 8)
    }

    var dayrpts = await dayrptService.getDayrptByCondition(begindate, enddate, stockcode)
    if (dayrpts == null || dayrpts.length == 0) { return res.status(OK).end(); }

    //获取振幅数据
    var rateanalysisdata = await analService.GetRateData(dayrpts);

    var bestrate: number = rateanalysisdata[rateanalysisdata.length - 1].rateprice;

    return res.status(OK).json({ bestrate, rateanalysisdata });
});


function convertDatetoStr(date: Date): string {
    return date.toISOString().split('T')[0]
}


// Export default
export default router;
