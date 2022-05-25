import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';
import dayrptService from '@services/dayrpt-service';
import sinaService from '@services/sinastock-service';
import { Stock } from '@repos/sinastock-repo';

import analService from '@services/analysis-service';
import { rateAnalysis, bolldata } from '@services/analysis-service';
import { Prisma } from '@prisma/client';



// Constants
const router = Router();
const { CREATED, OK } = StatusCodes;


// Paths
export const p = {
    getbyconditicon: '/allbycondition/:startday/:endday/:stockcode'
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
    if (dayrpts == null || dayrpts.length == 0) {
        return;
    }

    var txtresult: string = ""
    var mStock = await sinaService.getone(stockcode);
    var boll = await analService.bollCalc(dayrpts);
    var rsi = await analService.rsiCalc(dayrpts);

    if (isSameDay(enddate, todaydate) && Number(mStock.TradingVolume) > 0) {//如果是当日，则把实时数据放入,排除停牌情况
        if (todaydate.getHours() >= 9 && todaydate.getHours() <= 15) {
            var mdayrpttoday = await analService.GetTodayDayRpt(todaydate, stockcode, mStock)

            dayrpts.push(mdayrpttoday);

            let rsiReal = await analService.rsiCalc(dayrpts);

            dayrpts[dayrpts.length - 1].RSI7 = new Prisma.Decimal(rsiReal.rsi7);
            dayrpts[dayrpts.length - 1].RSI14 = new Prisma.Decimal(rsiReal.rsi14);

            console.log("sameday", convertDatetoStr(dayrpts[dayrpts.length - 1].ReportDay), dayrpts.length);
            txtresult += analService.getRealTxt(mStock, boll, rsiReal, dayrpts);
        }
    }

    //获取振幅数据
    var rateanalysisdata = await analService.GetRateData(dayrpts);
    txtresult += analService.getAnalyTxt(dayrpts, rateanalysisdata, boll, rsi, mStock);

    return res.status(OK).json({ txtresult, rateanalysisdata });
});

function convertDatetoStr(date: Date): string {
    return date.toISOString().split('T')[0]
}


function isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}




// Export default
export default router;
