import { t_StockDayReport, Prisma } from '@prisma/client'
import { Stock } from '@repos/sinastock-repo';
import simService, { txtOP } from '@services/simtrade-service';
import { isMpatton, stockOP } from '@services/simtrade-service';


const titleSize = "36px";
const txtSize = "18px";

/**
 * 获取实时分析
 * @param mStock 
 * @param boll
 * @param rsi 
 * @returns 
 */
async function getRealTxt(mStock: Stock, boll: bolldata, rsi: rsidata, dayrpts: t_StockDayReport[]): Promise<string> {
    var txtresult: string = "";
    var colorCurrent = "gray";
    var colorbollup = "black";
    var colorbolldown = "black";
    var colorRsi = "white";
    var rateprice = Number(mStock.TodayMaxPrice) - Number(mStock.TodayMinPrice);
    var myoper = stockOP.hold;

    if (Number(mStock.CurrentPrice) > Number(mStock.TodayOpeningPrice)) { colorCurrent = "red"; }
    if (Number(mStock.CurrentPrice) < Number(mStock.TodayOpeningPrice)) { colorCurrent = "green"; }

    if (Number(mStock.TodayMaxPrice) > Number(boll.up)) { colorbollup = "red"; }
    if (Number(mStock.TodayMinPrice) < Number(boll.down)) { colorbolldown = "green"; }

    if (await simService.isAdd(dayrpts, dayrpts.length - 1)) { myoper = stockOP.add; }

    if (simService.isReduce(dayrpts, dayrpts.length - 1)) { myoper = stockOP.reduce }
    console.log(myoper, isMpatton, dayrpts[dayrpts.length - 1].RSI7, dayrpts[dayrpts.length - 1].RSI14)

    txtresult += `[size=${titleSize}][B]实时数据：[/B][/size] \r\n`;
    txtresult += `&emsp;&emsp;[size=${txtSize}][B]现价：[color=${colorCurrent}]${mStock.CurrentPrice}[/color] &nbsp; 今高：${mStock.TodayMaxPrice} &nbsp; 今低：${mStock.TodayMinPrice}`;
    txtresult += `&nbsp; 振额：${rateprice.toFixed(2)}[/B][/size]`;
    txtresult += `&emsp;&emsp;[size=${txtSize}][B]BOLL：上:[color=${colorbollup}]${boll.up}[/color]&nbsp;中:${boll.ma}&nbsp;下:[color=${colorbolldown}]${boll.down}[/color][/B][/size]`;
    if (rsi.rsi7 != -1 && rsi.rsi14 != -1) {
        if (rsi.rsi7 > rsi.rsi14) { colorRsi = "red"; }
        if (rsi.rsi7 < rsi.rsi14) { colorRsi = "green"; }
        txtresult += `&emsp;&emsp; [size=${txtSize}][B]${rsi.analysis}[/B]`
        txtresult += `&nbsp;&nbsp;[B][color=${colorRsi}] RSI(7)：${rsi.rsi7} &nbsp;&nbsp; RSI(14)：${rsi.rsi14}[color][/B][/size]`;
    }
    if (myoper != stockOP.hold) {
        txtresult += `\r\n&emsp;&emsp; [size=${txtSize}][B]RSI建议：`
        if (myoper == stockOP.reduce) {
            txtresult += `卖出`
        }
        else { txtresult += `买入` }
        txtresult += `| &nbsp; ${txtOP}[/B][/size]`
    }

    return txtresult;
}


/**
 * 获取历史分析
 * @param dayrpts 
 * @param rateanalysisdata
 * @param rsi 
 * @returns 
 */
function getAnalyTxt(dayrpts: t_StockDayReport[], rateanalysisdata: rateAnalysis[], boll: bolldata, rsi: rsidata, mStock: Stock): string {

    var dayrptsCopy = [...dayrpts];
    dayrptsCopy.sort((a, b) => Number(a!.RatePrice) - Number(b!.RatePrice));

    var RPMin: number = Number(dayrptsCopy[0].RatePrice);
    var RPMax: number = Number(dayrptsCopy[dayrpts.length - 1].RatePrice);
    var bestPrice: number = rateanalysisdata[dayrpts.length - 1].rateprice
    var bb: number = (Number(mStock.CurrentPrice) - boll.down) / (boll.up - boll.down);
    bb = bb * 100;

    var txtresult = "";
    txtresult += `\r\n[b][size=${titleSize}] 历史数据：[/size][/b]\r\n`
    txtresult += `&emsp;&emsp;[b][size=${txtSize}]查询期内共有：${dayrpts.length}条日报数据[/size][/b]\r\n`;
    txtresult += `&emsp;&emsp;[b][size=${txtSize}]振额分析：最佳：${bestPrice.toFixed(2)}| 现价UP: ${(Number(mStock.CurrentPrice) + bestPrice).toFixed(2)} &nbsp; 现价DN：${(Number(mStock.CurrentPrice) - bestPrice).toFixed(2)}|`
    txtresult += `&emsp;最小：${RPMin.toFixed(2)} &nbsp;最大：${RPMax.toFixed(2)}[/size][/b]\r\n`;
    txtresult += `&emsp;&emsp;[b][size=${txtSize}]布林指标：UP:${boll.up} MID:${boll.ma} DN:${boll.down}STA:${boll.sta} WIDTH:${((boll.up - boll.down) / boll.ma).toFixed(2)} BB:${bb.toFixed(2)}[/size][/b]`
    if (rsi.rsi7 != -1) {
        txtresult += `\r\n&emsp;&emsp;[b][size=${txtSize}]RSI分析：`;
        txtresult += `${rsi.analysis} ;&emsp; RSI(7):${rsi.rsi7} &nbsp; RSI(14)：${rsi.rsi14}&nbsp; |&nbsp;RSI(7)预期：${rsi.rsi7expect.toFixed(2)} &nbsp;  RSI(14)预期：${rsi.rsi14expect.toFixed(2)} [/size][/b] \r\n`;
    }

    return txtresult;
}

async function GetRateData(dayrpts: t_StockDayReport[]): Promise<rateAnalysis[]> {

    var dayrptsCopy = [...dayrpts];
    dayrptsCopy.sort((a, b) => Number(a!.RatePrice) - Number(b!.RatePrice));

    var MaxDay: number = dayrptsCopy.length;

    var rateanalysisdata: Array<rateAnalysis> = [];
    for (let index = 0; index < dayrptsCopy.length; index++) {
        const element = dayrptsCopy[index];
        rateanalysisdata[index] = new rateAnalysis();
        rateanalysisdata[index].maxday = MaxDay;
        rateanalysisdata[index].rateprice = Number(element.RatePrice);
        rateanalysisdata[index].maxvalue = Number((Number(element.RatePrice) * MaxDay).toFixed(2));
        rateanalysisdata[index].reportday = element.ReportDay;
        // console.log(element.RatePrice + "|" + MaxDay + "|" );

        MaxDay--;
    }
    rateanalysisdata = rateanalysisdata.sort((a, b) => a.maxvalue - b.maxvalue);

    return rateanalysisdata;

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
        RSI14: new Prisma.Decimal(-1),
        WIDTH: new Prisma.Decimal(-1),
        BB: new Prisma.Decimal(-1)


    }

    return mDayrptToday
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
    var iCount14 = 0;
    for (let index = 1; index < dayrptsCopy.length; index++) {
        const element = dayrptsCopy[index];
        var iTemp = Number(element.TodayClosePrice) - Number(dayrptsCopy[index - 1].TodayClosePrice);
        if (index == 1) {
            mRsiData.rsi14expect = iTemp;

        }

        if (iTemp >= 0) {
            upSum += iTemp;
        } else {
            downSum += Math.abs(iTemp);
        }

        if (index >= (dayrptsCopy.length - 7)) {
            if (index == dayrptsCopy.length - 7) { mRsiData.rsi7expect = iTemp; }

            if (iTemp >= 0) {
                upSum7 += iTemp;
            } else {
                downSum7 += Math.abs(iTemp);
            }
            iCount7++;
        }

        iCount14++;

        if (index == (dayrptsCopy.length - 1)) {
            mRsiData.up7avg = upSum7 / 7;
            mRsiData.down7avg = downSum7 / 7;
            mRsiData.relativestrength7 = mRsiData.up7avg / mRsiData.down7avg;
            mRsiData.rsi7 = Number((100 - 100 / (mRsiData.relativestrength7 + 1)).toFixed(2));
            mRsiData.rsi7expect = mRsiData.rsi7expect + Number(element.TodayClosePrice);//预测第二天良好值

            if (dayrptsCopy.length > 14) {
                mRsiData.up14avg = upSum / 14;
                mRsiData.down14avg = downSum / 14;
                mRsiData.relativestrength14 = mRsiData.up14avg / mRsiData.down14avg;
                mRsiData.rsi14 = Number((100 - 100 / (mRsiData.relativestrength14 + 1)).toFixed(2));
                mRsiData.rsi14expect = mRsiData.rsi14expect + Number(element.TodayClosePrice);//预测第二天良好值

            }

        }
    }
    // console.log(mRsiData.rsi14expect);
    //  文字结论
    if (mRsiData.rsi14 == -1) {
        return mRsiData;
    }

    if (mRsiData.rsi7 <= 20) { mRsiData.analysis = "RSI(7) 极弱，超卖" }
    if (mRsiData.rsi7 > 20 && mRsiData.rsi7 < 50) { mRsiData.analysis = "RSI(7) 弱区" }
    if (mRsiData.rsi7 >= 50 && mRsiData.rsi7 < 80) { mRsiData.analysis = "RSI(7) 强区" }
    if (mRsiData.rsi7 >= 80) { mRsiData.analysis = "RSI(7) 极强，超买" }


    if (mRsiData.rsi7 > mRsiData.rsi14) { mRsiData.analysis += "|多头市场" }
    if (mRsiData.rsi7 < mRsiData.rsi14) { mRsiData.analysis += "|空头市场" }

    return mRsiData;


}

async function bollCalc(dayrpts: t_StockDayReport[]): Promise<bolldata> {
    var mBollData = new bolldata();
    var mDayRpt = dayrpts[dayrpts.length - 1];
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
    mBollData.bb = (Number(mDayRpt.TodayClosePrice) - mBollData.down) / (mBollData.up - mBollData.down);
    mBollData.width = (mBollData.up - mBollData.down) / mBollData.ma
    return mBollData;

}

function isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}



export class rsidata {
    rsi7: number = -1;
    rsi7expect: number = -1;
    up7avg: number = -1;
    down7avg: number = -1;
    relativestrength7: number = -1;
    rsi14: number = -1;
    rsi14expect: number = -1;
    up14avg: number = -1;
    down14avg: number = -1;
    relativestrength14: number = -1;
    analysis: string = "";
}

export class rateAnalysis {
    rateprice!: number;
    maxday!: number;
    maxvalue!: number;
    reportday!: Date;
}

export class bolldata {
    sta!: number;
    up!: number;
    down!: number;
    ma!: number;
    width!: number;
    bb!: number;
}




// Export default
export default {
    rsiCalc,
    getRealTxt,
    getAnalyTxt,
    bollCalc,
    GetTodayDayRpt,
    GetRateData,
    isSameDay,

} as const;
