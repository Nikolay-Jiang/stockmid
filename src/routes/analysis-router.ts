import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';
import { t_StockDayReport, Prisma } from '@prisma/client';
import dayrptService from '@services/dayrpt-service';
import sinaService from '@services/sinastock-service';
import { Stock } from '@repos/sinastock-repo';


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
    var boll = await bollCalc(dayrpts);
    var rsi = await rsiCalc(dayrpts);

    if (isSameDay(enddate, todaydate) && Number(mStock.TradingVolume) > 0) {//如果是当日，则把实时数据放入,排除停牌情况
        if (todaydate.getHours() > 9 && todaydate.getHours() < 15) {
            var mdayrpttoday = await GetTodayDayRpt(todaydate, stockcode, mStock)

            dayrpts.push(mdayrpttoday);
            console.log("sameday", dayrpts[dayrpts.length - 1].ReportDay.toUTCString());
            txtresult += getRealTxt(mStock, boll, rsi);
        }
    }

    dayrpts.sort((a, b) => Number(a!.RatePrice) - Number(b!.RatePrice));



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

    txtresult += getAnalyTxt(dayrpts, rateanalysisdata, boll, rsi, mStock);


    return res.status(OK).json({ txtresult, rateanalysisdata });
});

function convertDatetoStr(date: Date): string {
    return date.toISOString().split('T')[0]
}

function getRealTxt(mStock: Stock, boll: bolldata, rsi: rsidata): string {
    var txtresult: string = "";
    var colorCurrent = "gray";
    var colorbollup = "black";
    var colorbolldown = "black";
    if (Number(mStock.CurrentPrice) > Number(mStock.TodayOpeningPrice)) { colorCurrent = "red"; }
    if (Number(mStock.CurrentPrice) < Number(mStock.TodayOpeningPrice)) { colorCurrent = "green"; }

    if (Number(mStock.TodayMaxPrice) > Number(boll.up)) { colorbollup = "red"; }
    if (Number(mStock.TodayMinPrice) < Number(boll.down)) { colorbolldown = "green"; }

    txtresult += `[size=16]实时：[/size] \r\n`;
    txtresult += `[B]现价：[color=${colorCurrent}]${mStock.CurrentPrice}[/color] 最高：${mStock.TodayMaxPrice} 最低：${mStock.TodayMinPrice}[/B]|\r\n`;
    txtresult += `BOLL|UP:[color=${colorbollup}]${boll.up}[/color] MID:${boll.ma} DN:[color=${colorbolldown}]${boll.down}[/color]`;
    if (rsi.rsi7 != -1 && rsi.rsi14 != -1) {
        txtresult += `[B]${rsi.analysis}[/B]`
        txtresult += `RSI7:${rsi.rsi7} RSI14:${rsi.rsi14}`;
    }

    return txtresult;
}

function getAnalyTxt(dayrpts: t_StockDayReport[], rateanalysisdata: rateAnalysis[], boll: bolldata, rsi: rsidata, mStock: Stock): string {

    var RPMin: number = Number(dayrpts[0].RatePrice);
    var RPMax: number = Number(dayrpts[dayrpts.length - 1].RatePrice);
    var bestPrice: number = rateanalysisdata[dayrpts.length - 1].rateprice
    var bb: number = (Number(mStock.CurrentPrice) - boll.down) / (boll.up - boll.down);
    bb = bb * 100;
    
    var txtresult = "";
    txtresult += "\r\n数据分析：\r\n"
    txtresult += "      查询期内共有：" + dayrpts.length + "条日报数据\r\n";
    txtresult += "振额分析：\r\n";
    txtresult += `      最佳振幅：${bestPrice}| 现价UP: ${(Number(mStock.CurrentPrice) + bestPrice).toFixed(2)} | 现价DN：${(Number(mStock.CurrentPrice) - bestPrice).toFixed(2)}\r\n`
    txtresult += `      最小振额："${RPMin} 最大振幅：${RPMax}\r\n`;
    txtresult += `布林指标：\r\n`;
    txtresult += `      UP:${boll.up} MID:${boll.ma} DN:${boll.down}STA:${boll.sta} WIDTH:${((boll.up - boll.down) / boll.ma).toFixed(2)} BB:${bb.toFixed(2)}`
    if (rsi.rsi7 != -1) {
        txtresult += "\r\nRSI分析：\r\n";
        txtresult += `      ${rsi.analysis}\r\n`;
        txtresult += "      RSI7:" + rsi.rsi7 + "|rs:" + rsi.relativestrength7.toFixed(4) + "|UPavg:" + rsi.up7avg.toFixed(4) + "|DNavg:" + rsi.down7avg.toFixed(4) + "\r\n";
        txtresult += "      RSI14:" + rsi.rsi14 + "|rs:" + rsi.relativestrength14.toFixed(2) + "|UPavg:" + rsi.up14avg.toFixed(2) + "|DNavg:" + rsi.down14avg.toFixed(2) + "\r\n";
    }

    return txtresult;
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
    var upSum7 = 0;
    var downSum = 0;
    var downSum7 = 0;
    var iCount7 = 0;
    for (let index = 1; index < dayrptsCopy.length; index++) {
        const element = dayrptsCopy[index];
        var iTemp = Number(element.TodayClosePrice) - Number(dayrptsCopy[index - 1].TodayClosePrice);
        if (iTemp >= 0) {
            upSum += iTemp;
        } else {
            downSum += Math.abs(iTemp);
        }

        if (index >= (dayrptsCopy.length - 7)) {
            if (iTemp >= 0) {
                upSum7 += iTemp;
            } else {
                downSum7 += Math.abs(iTemp);
            }
            iCount7++;
        }


        if (index == (dayrptsCopy.length - 1)) {
            mRsiData.up7avg = upSum7 / 7;
            mRsiData.down7avg = downSum7 / 7;
            mRsiData.relativestrength7 = mRsiData.up7avg / mRsiData.down7avg;
            mRsiData.rsi7 = Number((100 - 100 / (mRsiData.relativestrength7 + 1)).toFixed(2));

            if (dayrptsCopy.length > 14) {
                mRsiData.up14avg = upSum / 14;
                mRsiData.down14avg = downSum / 14;
                mRsiData.relativestrength14 = mRsiData.up14avg / mRsiData.down14avg;
                mRsiData.rsi14 = Number((100 - 100 / (mRsiData.relativestrength14 + 1)).toFixed(2));
            }

        }
    }
    console.log(iCount7 + "|" + dayrptsCopy[0].ReportDay.toUTCString());
    //  文字结论
    if (mRsiData.rsi14 == -1) {
        return mRsiData;
    }

    if (mRsiData.rsi7 < 20) { mRsiData.analysis = "RSI7 极弱，超卖" }
    if (mRsiData.rsi7 > 20 && mRsiData.rsi7 < 50) { mRsiData.analysis = "RSI7 弱区" }
    if (mRsiData.rsi7 > 50 && mRsiData.rsi7 < 80) { mRsiData.analysis = "RSI7 强区" }
    if (mRsiData.rsi7 > 80) { mRsiData.analysis = "RSI7 极强，超买" }


    if (mRsiData.rsi7 > mRsiData.rsi14) { mRsiData.analysis += "|多头市场" }
    if (mRsiData.rsi7 < mRsiData.rsi14) { mRsiData.analysis += "|空头市场" }

    return mRsiData;


}

function isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}


async function GetTodayDayRpt(today: Date, stockcode: string, mStock: Stock): Promise<t_StockDayReport> {

    var fRatePrice = Number(mStock.TodayMaxPrice) - Number(mStock.TodayMinPrice);
    var fRatetemp = (fRatePrice / Number(mStock.TodayMinPrice)).toFixed(2);
    var tradingpriceAvg = (Number(mStock.TradingPrice) / Number(mStock.TradingVolume)).toFixed(2);

    var mDayrptToday: t_StockDayReport = {
        StockCode: stockcode,
        ReportDay: today,
        TodayOpenPrice: new Prisma.Decimal(mStock.TodayOpeningPrice),
        TodayMaxPrice: new Prisma.Decimal(mStock.TodayMaxPrice),
        TodayMinPrice: new Prisma.Decimal(mStock.TodayMinPrice),
        TodayClosePrice: new Prisma.Decimal(mStock.CurrentPrice),
        Rate: new Prisma.Decimal(fRatetemp),
        RatePrice: new Prisma.Decimal(Number(mStock.TodayMaxPrice) - Number(mStock.TodayMinPrice)),
        Memo: "",
        TradingVol: new Prisma.Decimal(mStock.TradingVolume),
        TradingPrice: new Prisma.Decimal(mStock.TradingPrice),
        TradingPriceAvg: new Prisma.Decimal(tradingpriceAvg),
        MA: new Prisma.Decimal(-1),
        bollUP: new Prisma.Decimal(-1),
        bollDown: new Prisma.Decimal(-1),
        RSI7: new Prisma.Decimal(-1),
        RSI14: new Prisma.Decimal(-1)

    }

    return mDayrptToday
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
