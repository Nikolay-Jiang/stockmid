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
    var rsi = await rsiCalc(dayrpts);
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

    var txtresult: string = "分析数据：\r\n"
    txtresult += "查询期内共有：" + dayrpts.length + "条日报数据\r\n";
    txtresult += "振额分析：\r\n";
    txtresult += "最小振额：" + RPMin + ",日期：" + convertDatetoStr(dayrpts[0].ReportDay);
    txtresult += "最大振幅： " + RPMax + ",日期：" + convertDatetoStr(dayrpts[dayrpts.length - 1].ReportDay);
    txtresult += "\r\n最佳振幅： " + rateanalysisdata[dayrpts.length - 1].rateprice + " 计算值：" + rateanalysisdata[dayrpts.length - 1].maxday + "|" + rateanalysisdata[dayrpts.length - 1].maxvalue;
    txtresult += "\r\nMA:" + boll.ma + "|STA:" + boll.sta + "|UP:" + boll.up + "|DOWN:" + boll.down;
    if (rsi.rsi7 != -1) {
        txtresult += "RSI分析：\r\n";
        txtresult += rsi.analysis;
        txtresult += "\r\nRSI7:" + rsi.rsi7 + "|rs:" + rsi.relativestrength7.toFixed(2) + "|UPavg:" + rsi.up7avg.toFixed(2) + "|DOWNavg:" + rsi.down7avg.toFixed(2);
        txtresult += "\r\nRSI14:" + rsi.rsi14 + "|rs:" + rsi.relativestrength14.toFixed(2) + "|UPavg:" + rsi.up14avg.toFixed(2) + "|DOWNavg:" + rsi.down14avg.toFixed(2);
    }


    return res.status(OK).json({ txtresult, rateanalysisdata });
});

function convertDatetoStr(date: Date): string {
    return date.toISOString().split('T')[0]
}

async function bollCalc(dayrpts: t_StockDayReport[]): Promise<bolldata> {
    var mBollData = new bolldata();
    var dayrptsCopy = [...dayrpts];

    if (dayrpts.length == 0) {
        return mBollData;
    }
    if (dayrpts.length > 20) {
        dayrptsCopy = dayrptsCopy.slice(dayrptsCopy.length - 20, dayrptsCopy.length);
    }

    // console.log(dayrptsCopy.length + "|" + dayrptsCopy[dayrptsCopy.length-1].ReportDay.toUTCString());

    var sumClose = dayrptsCopy.reduce((c, R) => c + Number(R.TodayClosePrice), 0)
    mBollData.ma = Number((sumClose / dayrptsCopy.length).toFixed(2));
    var staTemp: number = 0;
    for (let index = 0; index < dayrptsCopy.length; index++) {
        const element = dayrptsCopy[index];
        staTemp += Math.pow(Number(element.TodayClosePrice) - mBollData.ma, 2);
    }
    mBollData.sta = Number(Math.sqrt(staTemp / (dayrptsCopy.length - 1)).toFixed(2))
    mBollData.up = Number((mBollData.ma + mBollData.sta * 2).toFixed(2));
    mBollData.down = Number((mBollData.ma - mBollData.sta * 2).toFixed(2));

    return mBollData;

}

async function rsiCalc(dayrpts: t_StockDayReport[]): Promise<rsidata> {
    var mRsiData = new rsidata();
    mRsiData.rsi7 = -1;
    mRsiData.rsi14 = -1;
    if (dayrpts.length == 0 || dayrpts.length < 7) {
        return mRsiData;
    }
    var dayrptsCopy = [...dayrpts];

    if (dayrptsCopy.length > 15) {
        dayrptsCopy = dayrptsCopy.slice(dayrptsCopy.length - 15, dayrptsCopy.length);
    }

    var upSum = 0;
    var downSum = 0;
    for (let index = 1; index < dayrptsCopy.length; index++) {
        const element = dayrptsCopy[index];
        var iTemp = Number(element.TodayClosePrice) - Number(dayrptsCopy[index - 1].TodayClosePrice);
        if (iTemp >= 0) {
            upSum += iTemp;
        } else {
            downSum += Math.abs(iTemp);
        }
        if (index == 7) {
            mRsiData.up7avg = upSum / 7;
            mRsiData.down7avg = downSum / 7;
            mRsiData.relativestrength7 = mRsiData.up7avg / mRsiData.down7avg;
            mRsiData.rsi7 = Number((100 - 100 / (mRsiData.relativestrength7 + 1)).toFixed(2));
        }

        if (index == 14) {
            mRsiData.up14avg = upSum / 14;
            mRsiData.down14avg = downSum / 14;
            mRsiData.relativestrength14 = mRsiData.up14avg / mRsiData.down14avg;
            mRsiData.rsi14 = Number((100 - 100 / (mRsiData.relativestrength14 + 1)).toFixed(2));
        }
    }
    //  文字结论
    if (mRsiData.rsi14 == -1) {
        return mRsiData;
    }

    if (mRsiData.rsi7 < 20) { mRsiData.analysis = "RS7 处于极弱，超卖" }
    if (mRsiData.rsi7 > 20 && mRsiData.rsi7 < 50) { mRsiData.analysis = "RS7 处于弱区" }
    if (mRsiData.rsi7 > 50 && mRsiData.rsi7 < 80) { mRsiData.analysis = "RS7 处于强区" }
    if (mRsiData.rsi7 > 80) { mRsiData.analysis = "RS7 处于极强，超买" }


    if (mRsiData.rsi7 > mRsiData.rsi14) { mRsiData.analysis += "|多头市场" }
    if (mRsiData.rsi7 < mRsiData.rsi14) { mRsiData.analysis += "|空头市场" }

    return mRsiData;


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

class rsidata {
    rsi7: number = -1;
    up7avg: number = -1;
    down7avg: number = -1;
    relativestrength7: number = -1;
    rsi14: number = -1;
    up14avg: number = -1;
    down14avg: number = -1;
    relativestrength14: number = -1;
    analysis: string = "";
}


// Export default
export default router;
