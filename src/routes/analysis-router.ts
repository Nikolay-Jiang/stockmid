import StatusCodes, { TOO_MANY_REQUESTS } from 'http-status-codes';
import { Request, Response, Router } from 'express';
import dayrptService from '@services/dayrpt-service';


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

    //修车UTC存储问题
    if (begindate.getHours() == 0) {
        begindate.setHours(begindate.getHours() + 8)
    }
    if (enddate.getHours() == 0) {
        enddate.setHours(enddate.getHours() + 8)
    }

    var dayrpts = await dayrptService.getDayrptByCondition(begindate, enddate, stockcode)
    if (dayrpts == null) {
        return;
    }
    dayrpts.sort((a, b) => Number(a!.RatePrice) - Number(b!.RatePrice));

    var RPMin: number = Number(dayrpts[0].RatePrice);
    var RPMax: number = Number(dayrpts[dayrpts.length - 1].RatePrice);
    var MA: number = 0;

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
        MA+=Number(element.TodayClosePrice);

        MaxDay--;
    }
    rateanalysisdata = rateanalysisdata.sort((a, b) => a.maxvalue - b.maxvalue);

    MA=Number((MA/rateAnalysis.length).toFixed(2));

    var txtresult: string = "分析数据：\r\n"
    txtresult += "查询期内共有：" + dayrpts.length + "条日报数据\r\n";
    txtresult += "振额分析：\r\n";
    txtresult += "最小振额：" + RPMin + ",日期：" + convertDatetoStr(dayrpts[0].ReportDay);
    txtresult += "最大振幅： " + RPMax + ",日期：" + convertDatetoStr(dayrpts[dayrpts.length - 1].ReportDay);
    txtresult += "\r\n最佳振幅： " + rateanalysisdata[dayrpts.length - 1].rateprice + " 计算值：" + rateanalysisdata[dayrpts.length - 1].maxday + "|" + rateanalysisdata[dayrpts.length - 1].maxvalue;
    txtresult += "MA:"+MA;
    return res.status(OK).json({ txtresult, rateanalysisdata });
});

function convertDatetoStr(date: Date): string {
    return date.toISOString().split('T')[0]
}

class rateAnalysis {
    rateprice!: number;
    maxday!: number;
    maxvalue!: number;
    reportday!: Date;
}


// Export default
export default router;
