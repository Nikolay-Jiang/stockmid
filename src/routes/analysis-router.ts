import StatusCodes, { TOO_MANY_REQUESTS } from 'http-status-codes';
import { Request, Response, Router } from 'express';
import dayrptService from '@services/dayrpt-service';
import { t_StockDayReport } from '@prisma/client';


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
    var boll = await bollCalc(dayrpts);

    dayrpts.sort((a, b) => Number(a!.RatePrice) - Number(b!.RatePrice));

    var RPMin: number = Number(dayrpts[0].RatePrice);
    var RPMax: number = Number(dayrpts[dayrpts.length - 1].RatePrice);

    var MaxDay: number = dayrpts.length;
    var rateanalysisdata: Array<rateAnalysis> = [];
    for (let index = 0; index < dayrpts.length; index++) {
        const element = dayrpts[index];
        rateanalysisdata[index] = new rateAnalysis();
        rateanalysisdata[index].maxday = MaxDay;
        rateanalysisdata[index].rateprice = Number(element.RatePrice);
        rateanalysisdata[index].maxvalue = Number((Number(element.RatePrice) * MaxDay).toFixed(2));
        rateanalysisdata[index].reportday = element.ReportDay;
        // console.log(element.RatePrice + "|" + MaxDay + "|" );

        MaxDay--;
    }
    rateanalysisdata = rateanalysisdata.sort((a, b) => a.maxvalue - b.maxvalue);


    console.log("|" + boll.ma);


    var txtresult: string = "分析数据：\r\n"
    txtresult += "查询期内共有：" + dayrpts.length + "条日报数据\r\n";
    txtresult += "振额分析：\r\n";
    txtresult += "最小振额：" + RPMin + ",日期：" + convertDatetoStr(dayrpts[0].ReportDay);
    txtresult += "最大振幅： " + RPMax + ",日期：" + convertDatetoStr(dayrpts[dayrpts.length - 1].ReportDay);
    txtresult += "\r\n最佳振幅： " + rateanalysisdata[dayrpts.length - 1].rateprice + " 计算值：" + rateanalysisdata[dayrpts.length - 1].maxday + "|" + rateanalysisdata[dayrpts.length - 1].maxvalue;
    txtresult += "\r\nMA:" + boll.ma + "|STA:" + boll.sta + "|UP:" + boll.up + "|DOWN:" + boll.down;
    return res.status(OK).json({ txtresult, rateanalysisdata });
});

function convertDatetoStr(date: Date): string {
    return date.toISOString().split('T')[0]
}

async function bollCalc(dayrpts: t_StockDayReport[]): Promise<bolldata> {
    var mBollData = new bolldata();
    if (dayrpts.length == 0) {
        return mBollData;
    }
    var sumClose = dayrpts.reduce((c, R) => c + Number(R.TodayClosePrice), 0)
    mBollData.ma = Number((sumClose / dayrpts.length).toFixed(2));
    var staTemp: number = 0;
    for (let index = 0; index < dayrpts.length; index++) {
        const element = dayrpts[index];
        staTemp += Math.pow(Number(element.TodayClosePrice) - mBollData.ma, 2);
    }
    mBollData.sta = Number(Math.sqrt(staTemp / (dayrpts.length - 1)).toFixed(2))
    mBollData.up = Number((mBollData.ma + mBollData.sta * 2).toFixed(2));
    mBollData.down = Number((mBollData.ma - mBollData.sta * 2).toFixed(2));

    return mBollData;

}


class rateAnalysis {
    rateprice!: number;
    maxday!: number;
    maxvalue!: number;
    reportday!: Date;
}

class bolldata {
    sta!: number;
    up!: number;
    down!: number;
    ma!: number;
}


// Export default
export default router;
