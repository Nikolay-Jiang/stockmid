import { t_StockDayReport, Prisma } from '@prisma/client'
// import { Stock } from '@repos/sinastock-repo';
import dayrptService from '@services/dayrpt-service';
import analService, { rsidata } from '@services/analysis-service';
import sinaService from '@services/sinastock-service';

export var isMpatton: boolean = false;
export var isWpatton: boolean = false;
export var iCountW: number = 0;


export var txtOP = "";

var iRsi1 = 0;
var iRsi2 = 0;
var iRsi3 = 0;
var iRsi4 = 0;
var iRsi5 = 0;
var iRsi6 = 0;
var iRsi7 = 0;
var iRsi8 = 0;
var iRsi9 = 0;



async function isAdd(dayrpts: t_StockDayReport[], index: number): Promise<boolean> {
    txtOP = "";
    var eleCurr = dayrpts[index];
    var eleYesterday = dayrpts[index - 1];
    // var eleBeforeyes = dayrpts[index - 2];
    var todayRSI14 = Number(eleCurr.RSI14)
    var todayRSI7 = Number(eleCurr.RSI7)
    var yesRSI14 = Number(eleYesterday.RSI14)
    var yesRSI7 = Number(eleYesterday.RSI7)

    var isStrong7 = false;
    var isStrong14 = false;

    if (todayRSI7 > 50) { isStrong7 = true; }
    if (todayRSI14 > 50) { isStrong14 = true; }

    if (isMpatton && todayRSI7 < 40) {
        isMpatton = false;
    }
    if (isMpatton) { return false }


    if (isWpatton && todayRSI7 >= 50) {
        isWpatton = false;
        iCountW = 0;
    }

    if (isWpatton && iCountW < 2) {
        if (todayRSI7 < yesRSI7) {//W2 下跌
            iCountW = 0;
            isWpatton = false;
            return false;
        }
        iCountW++;
        return true;
    }
    if (iCountW >= 2) {
        iCountW == 0;
        isWpatton = false;
    }

    if (await isW(dayrpts, index, 20)) {
        isWpatton = true;
        iCountW++;
        txtOP = "W 通道"
        return true;
    }



    if (todayRSI7 < 20) {
        return false;
    }
    if (todayRSI7 < 25 && todayRSI14 < 20) {
        return false;
    }

    //RSI 双升
    if (todayRSI14 > yesRSI14 && todayRSI7 > yesRSI7) { txtOP = "双升"; return true; }

    return false
}


function isReduce(dayrpts: t_StockDayReport[], index: number): boolean {
    // txtOP = "";
    var eleCurr = dayrpts[index];
    var eleYesterday = dayrpts[index - 1];
    // var eleBeforeyes = dayrpts[index - 2];
    var todayRSI14 = Number(eleCurr.RSI14)
    var todayRSI7 = Number(eleCurr.RSI7)
    var yesRSI14 = Number(eleYesterday.RSI14)
    var yesRSI7 = Number(eleYesterday.RSI7)

    var isStrong7 = false;
    var isStrong14 = false;


    if (todayRSI7 > 50) { isStrong7 = true; }
    if (todayRSI14 > 50) { isStrong14 = true; }

    //超卖情况
    if (todayRSI7 < 20) { return false; }

    if (isWpatton) { return false; }

    if (todayRSI7 >= 50) {
        isMpatton = isM(dayrpts, index);
        if (isMpatton) {//M 右侧第一次减仓
            txtOP = "M 右侧第一次出现"
            return true;
        }
    }

    if (isMpatton && todayRSI7 < 40) {//小于 40 自动解除
        isMpatton = false
    }

    //忽略处于 M右侧的状态
    if (isMpatton) { txtOP = "M 右侧"; return false; }



    if (todayRSI14 > yesRSI14 && todayRSI7 > yesRSI7 && isStrong7) {//RSI 双升 7强 短期高位
        // if (yesRSI7 < 50 && todayRSI7 >= 50 && yesRSI14 < 50 && todayRSI14 > 50) {//弱转强
        //     return false;
        // }
        if (isRecentHigh(dayrpts, index, 2)) { txtOP = "双升 RSI7 强 3天内高位"; return true; }
    }

    if (todayRSI14 > yesRSI14 && todayRSI7 > yesRSI7) {//RSI 双升  5日高位
        if (isRecentHigh(dayrpts, index, 5)) { txtOP = "双升 RSI7 强 5天内高位"; return true; }
    }

    //RSI 双降
    if (todayRSI14 < yesRSI14 && todayRSI7 < yesRSI7) { txtOP = "双降"; return true; }

    //RSI14 单降
    if (todayRSI14 < yesRSI14 && todayRSI7 >= yesRSI7) {
        if (yesRSI7 < 50 && todayRSI7 >= 50 && todayRSI7 > todayRSI14) {//RSI7 十字
            return false;
        }
        // if (Math.abs(todayRSI14-yesRSI14)<=0.5) {//偏差小于1忽略
        //     return false
        // }
        txtOP = "RSI 14 单降"; return true;
    }

    return false
}

function isBuy(dayrpts: t_StockDayReport[], index: number): boolean {
    return false
}


function isSell(dayrpts: t_StockDayReport[], index: number): boolean {
    return false
}


function isM(dayrpts: t_StockDayReport[], index: number): boolean {

    var eleCurr = dayrpts[index];
    var eleYesterday = dayrpts[index - 1];

    var todayRSI7 = Number(eleCurr.RSI7)
    var yesRSI7 = Number(eleYesterday.RSI7)
    var iFirst = 0;//第一峰
    var iSec = 0;//第二峰
    var dayrptsCopy = dayrpts.slice(0, index);

    if (dayrptsCopy.length < 5) {
        return false;
    }
    if (dayrptsCopy.length > 7) {
        dayrptsCopy = dayrptsCopy.slice(dayrptsCopy.length - 7, dayrptsCopy.length);
    }


    //获得两个> 50 的峰值，
    if (todayRSI7 >= yesRSI7) { return false; }//当天上升

    var dayrpsTemp = [...dayrptsCopy]
    dayrpsTemp.sort((a, b) => Number(a!.RSI7) - Number(b!.RSI7));



    var iMax = dayrptsCopy.findIndex(x => Number(x.RSI7) == Number(dayrpsTemp[dayrpsTemp.length - 1].RSI7));
    var iMaxsec = dayrptsCopy.findIndex(x => Number(x.RSI7) == Number(dayrpsTemp[dayrpsTemp.length - 2].RSI7));

    if (Number(dayrpsTemp[dayrpsTemp.length - 2].RSI7) < 50) { return false; }
    if (iMax < 0 || iMaxsec < 0) { return false; }//没找到

    if (iMax + 1 == iMaxsec || iMaxsec + 1 == iMax) { return false; }//处理指标紧邻的情况

    if (iMax > iMaxsec) {
        iFirst = iMaxsec;
        iSec = iMax;
    }
    else {
        iFirst = iMax;
        iSec = iMaxsec;
    }

    if (iFirst == 0) {
        return false;
    }


    return true;
}

async function isW(dayrpts: t_StockDayReport[], index: number, iRSIDecide: number, RSIavg: number = 21, isIgnoreTremor: boolean = true): Promise<boolean> {
    var eleCurr = dayrpts[index];
    var eleYesterday = dayrpts[index - 1];

    var todayRSI7 = Number(eleCurr.RSI7)
    var yesRSI7 = Number(eleYesterday.RSI7)
    var beforeYseRSI7 = Number(dayrpts[index - 2].RSI7)
    var last3rsiavg = (todayRSI7 + yesRSI7 + beforeYseRSI7) / 3

    var iFirst = 0;//第一峰
    var iSec = 0;//第二峰
    var dayrptsCopy = dayrpts.slice(0, index);

    if (dayrptsCopy.length < 5) { return false; }

    if (dayrptsCopy.length > 7) { dayrptsCopy = dayrptsCopy.slice(dayrptsCopy.length - 7, dayrptsCopy.length); }

    if (!isIgnoreTremor) {
        if (validTremor(dayrptsCopy)) { console.log("Tremor"); return false; }
    }


    // console.log(RSIavg, yesRSI7, last3rsiavg)
    if (RSIavg > 21 && yesRSI7 < 20) {
        if (last3rsiavg <= 21) { return false; }
    }

    if (last3rsiavg <= RSIavg) { return false }//波动幅度太小


    //获得两个< iRSIDecide 的峰值 并计算是否符合W
    if (yesRSI7 >= iRSIDecide) { return false }
    if (todayRSI7 <= yesRSI7) { return false; }//当天下降

    var dayrpsTemp = [...dayrptsCopy]
    dayrpsTemp.sort((a, b) => Number(a!.RSI7) - Number(b!.RSI7));

    var iCurr = dayrptsCopy.findIndex(x => Number(x.RSI7) == yesRSI7);


    var iMin = dayrptsCopy.findIndex(x => Number(x.RSI7) == Number(dayrpsTemp[0].RSI7));
    var iMinsec = dayrptsCopy.findIndex(x => Number(x.RSI7) == Number(dayrpsTemp[1].RSI7));

    if (iMin != iCurr) { iMinsec = iCurr }

    // console.log(eleCurr.StockCode, eleCurr.ReportDay.toDateString(), iMin, iMinsec, Number(dayrptsCopy[iMin].RSI7), Number(dayrptsCopy[iMinsec].RSI7))

    if (Number(dayrptsCopy[iMinsec].RSI7) > iRSIDecide) { return false; }//一个指标小于20 另一个可以放宽到30

    if (iMin < 0 || iMinsec < 0) { return false; }//没找到

    if (iMin + 1 == iMinsec || iMinsec + 1 == iMin || iMin == iMinsec) { return false; }//处理指标紧邻的情况


    if (iMin > iMinsec) {
        iFirst = iMinsec;
        iSec = iMin;
    }
    else {
        iFirst = iMin;
        iSec = iMinsec;
    }

    if (iFirst == 0) {
        // console.log("step3");
        return false;
    }


    if (isUnderLow(iFirst, iSec, dayrptsCopy)) {
        // console.log("step4");
        return false;
    }
    // console.log(iFirst, iSec, eleCurr.StockCode,dayrptsCopy[iFirst].RSI7,dayrptsCopy[iSec].RSI7);

    return true;
}

//检查大幅波动
function validTremor(dayrpts: t_StockDayReport[], rate: number = 2): boolean {
    if (dayrpts.length == 0) { return false; }
    var stockcode = dayrpts[0].StockCode;

    var iTremor = rate + 10;

    //科创板情况
    if (stockcode.startsWith("sh688")) { iTremor = rate + 20; }
    if (stockcode.startsWith("sz300")) { iTremor = rate + 20; }

    for (let index = 1; index < dayrpts.length; index++) {
        const element = dayrpts[index];
        var yesPrice = Number(dayrpts[index - 1].TodayClosePrice);
        var todayPrice = Number(dayrpts[index].TodayClosePrice);

        var iRatePrice = todayPrice - yesPrice;
        var iTemp = iRatePrice / yesPrice
        if (iTemp >= iTremor) { return true; }

    }


    return false;
}


//检查RSI7 区段内是否都小于20
function isUnderLow(iFirst: number, iSec: number, dayrpts: t_StockDayReport[]): boolean {
    if (dayrpts.length == 0) {
        return false;
    }

    for (let index = iFirst; index < iSec; index++) {
        const CurrentRS7 = Number(dayrpts[index].RSI7);
        if (CurrentRS7 > 20) {
            return false
        }
    }

    return true

}


/*
* 短期高位判断
*/
function isRecentHigh(dayrps: t_StockDayReport[], index: number, dayCount: number): boolean {
    if ((index - dayCount) >= 0) {//计算三天
        var element = dayrps[index];
        var dayrpsTemp = dayrps.slice(index - dayCount, index);
        dayrpsTemp.sort((a, b) => Number(a!.TodayMaxPrice) - Number(b!.TodayMaxPrice));

        if (Number(dayrpsTemp[dayrpsTemp.length - 1].TodayMaxPrice) <= Number(element.TodayMaxPrice)) {
            // console.log("recentHI!!!")
            return true;
        }

    }

    return false;
}


/*
* 短期低位判断
*/
function isRecentLow(dayrps: t_StockDayReport[], index: number, dayCount: number): boolean {
    if ((index - dayCount) >= 0) {
        var element = dayrps[index];
        var dayrpsTemp = dayrps.slice(index - dayCount, index);

        dayrpsTemp.sort((a, b) => Number(a!.TodayMinPrice) - Number(b.TodayMinPrice));
        if (Number(dayrpsTemp[0].TodayMinPrice) >= Number(element.TodayMinPrice)) {
            console.log("recentLow!!!")
            return true;
        }

    }

    return false;
}

async function findW(enddate: Date, needtoday: boolean = false): Promise<wresult[]> {

    var yesdate: Date = new Date(enddate);
    if (enddate.getHours() == 0) { enddate.setHours(enddate.getHours() + 8); }
    if (yesdate.getHours() == 0) { yesdate.setHours(yesdate.getHours() + 8); }

    //处理周末的情况
    if (enddate.getDay() == 0) { enddate.setDate(enddate.getDate() - 2); }
    if (enddate.getDay() == 6) { enddate.setDate(enddate.getDate() - 1); }
    yesdate.setDate(enddate.getDate() - 1)
    if (enddate.getDay() == 1) { yesdate.setDate(enddate.getDate() - 3); }


    var wresults: Array<wresult> = [];
    var iResult = 0;

    var dayrptsYes = await dayrptService.getDayrptByReportDay(yesdate);

    if (dayrptsYes.length == 0) { return wresults; }
    console.log(yesdate.toDateString())

    dayrptsYes = dayrptsYes.filter(x => Number(x.RSI7) < 30 && x.RSI7 != null && Number(x.TodayClosePrice) >= 15 && Number(x.RSI7) >= 0);
    // dayrptsYes = dayrptsYes.filter(x => Number(x.RSI7) >= 20 && x.RSI7 != null && Number(x.TodayClosePrice) >= 12 && Number(x.RSI7) >= 0);

    if (dayrptsYes.length == 0) { return wresults; }

    var startdate = new Date(enddate);
    startdate.setDate(enddate.getDate() - 15);
    var dayrpts = await dayrptService.getDayrptByReportDay2(startdate, enddate);

    if (dayrpts.length == 0) { return wresults; }


    for (let index = 0; index < dayrptsYes.length; index++) {
        const element = dayrptsYes[index];

        var dayrptsTemp = dayrpts.filter(x => x.StockCode == element.StockCode);
        if (dayrptsTemp.length == 0) { continue; }

        if (needtoday) {
            //获取当日实时数据
            var mStock = await sinaService.getone(element.StockCode);

            if (!analService.isSameDay(dayrptsTemp[dayrptsTemp.length - 1].ReportDay, mStock.SearchTime)) {//确认没有当日数据
                if (analService.isSameDay(mStock.SearchTime, enddate)) {//如果查询日期和最后天相同
                    //实时数据转RPT
                    var mdayrpttoday = await analService.GetTodayDayRpt(enddate, mStock.stockcode, mStock)

                    dayrptsTemp.push(mdayrpttoday);
                    var rsi = await analService.rsiCalc(dayrptsTemp);
                    var boll = await analService.bollCalc(dayrptsTemp);

                    mdayrpttoday.RSI7 = new Prisma.Decimal(rsi.rsi7);
                    mdayrpttoday.RSI14 = new Prisma.Decimal(rsi.rsi14);
                    mdayrpttoday.BB = new Prisma.Decimal(boll.bb);
                    mdayrpttoday.WIDTH = new Prisma.Decimal(boll.width);

                    dayrpts[dayrpts.length - 1].RSI7 = mdayrpttoday.RSI7;
                    dayrpts[dayrpts.length - 1].RSI14 = mdayrpttoday.RSI14;
                    dayrpts[dayrpts.length - 1].BB = mdayrpttoday.BB;
                    dayrpts[dayrpts.length - 1].WIDTH = mdayrpttoday.WIDTH;
                }
            }

        }

        if (!needtoday) {
            if (!analService.isSameDay(dayrptsTemp[dayrptsTemp.length - 1].ReportDay, enddate)) { continue; }//排除当日无数据的情况    
        }


        var todayRSI7 = Number(dayrptsTemp[dayrptsTemp.length - 1].RSI7);
        var todayRSI14 = Number(dayrptsTemp[dayrptsTemp.length - 1].RSI14);
        var todayPrice = Number(dayrptsTemp[dayrptsTemp.length - 1].TradingPriceAvg);
        var todayWidth = Number(dayrptsTemp[dayrptsTemp.length - 1].WIDTH);
        var todayBB = Number(dayrptsTemp[dayrptsTemp.length - 1].BB);
        var mResult = new wresult();

        var ratedatas = await analService.GetRateData(dayrptsTemp);
        var bestRate = ratedatas[ratedatas.length - 1].rateprice;


        if (todayWidth > 0.22) { continue; }
        if (todayBB > 0.55) { continue; }
        if (bestRate < 0.2) { continue; }



        if (await isW(dayrptsTemp, dayrptsTemp.length - 1, 30, 29, false)) {
            if (Number(element.RSI7) <= todayRSI7) {
                mResult.stockcode = element.StockCode
                mResult.rsi7 = todayRSI7;
                mResult.rsi14 = todayRSI14;
                mResult.Type = rdType.wpatton;
                mResult.price = todayPrice;
                mResult.MA = Number(dayrptsTemp[dayrptsTemp.length - 1].MA);
                mResult.bollDown = Number(dayrptsTemp[dayrptsTemp.length - 1].bollDown);
                wresults[iResult] = mResult;
                iResult++;
            }
            console.log(todayRSI7, todayRSI14, element.StockCode, mResult.Type, bestRate)

        }

    }
    return wresults;
}

/*
* 该算法灵感来源于 300415 从 2022.6.1-2022.6.8 RSI 持续双升 并走出高位的状态
*/
async function findYZM(dayrpts: t_StockDayReport[]): Promise<wresult[]> {

    var wresults: Array<wresult> = [];
    var iResult = 0;

    //RSI7,14   从50+ 平稳上升到 60+ 再上升至 70,且连续穿透上线

    return wresults;

}

async function findDoubleRise(enddate: Date): Promise<wresult[]> {
    var yesdate: Date = new Date(enddate);
    if (enddate.getHours() == 0) { enddate.setHours(enddate.getHours() + 8); }
    if (yesdate.getHours() == 0) { yesdate.setHours(yesdate.getHours() + 8); }

    //处理周末的情况
    if (enddate.getDay() == 0) { enddate.setDate(enddate.getDate() - 2); }
    if (enddate.getDay() == 6) { enddate.setDate(enddate.getDate() - 1); }
    yesdate.setDate(enddate.getDate() - 1)
    if (enddate.getDay() == 1) { yesdate.setDate(enddate.getDate() - 3); }


    var wresults: Array<wresult> = [];
    var iResult = 0;

    var dayrptsYes = await dayrptService.getDayrptByReportDay(yesdate);
    dayrptsYes = dayrptsYes.filter(x => Number(x.TradingPriceAvg) > 10 && Number(x.TradingPriceAvg) < 200)
    if (dayrptsYes.length == 0) { return wresults; }

    var dayrpts = await dayrptService.getDayrptByReportDay(enddate);
    if (dayrpts.length == 0) { return wresults; }


    for (let index = 0; index < dayrptsYes.length; index++) {
        const element = dayrptsYes[index];
        var yesRSI7 = Number(element.RSI7);
        var yesRSI14 = Number(element.RSI14);

        var dayrptsTemp = dayrpts.filter(x => x.StockCode == element.StockCode)
        if (dayrptsTemp.length == 0) { continue; }

        var todayRSI7 = Number(dayrptsTemp[0].RSI7);
        var todayRSI14 = Number(dayrptsTemp[0].RSI14);
        var todayPrice = Number(dayrptsTemp[0].TradingPriceAvg);
        var mResult = new wresult();

        if (todayRSI14 > yesRSI14 && todayRSI7 > yesRSI7) {
            mResult.stockcode = element.StockCode
            mResult.rsi7 = todayRSI7;
            mResult.rsi14 = todayRSI14;
            mResult.Type = rdType.doubleRise;
            mResult.price = todayPrice;
            mResult.MA = Number(dayrptsTemp[dayrptsTemp.length - 1].MA);
            mResult.bollDown = Number(dayrptsTemp[dayrptsTemp.length - 1].bollDown);
            wresults[iResult] = mResult;
            iResult++;

            var stat = parseInt((yesRSI7 / 10).toFixed(2))
            // console.log(stat)
            if (stat == 1) { iRsi1++; }
            if (stat == 2) { iRsi2++; }
            if (stat == 3) { iRsi3++; }
            if (stat == 4) { iRsi4++; }
            if (stat == 5) { iRsi5++; }
            if (stat == 6) { iRsi6++; }
            if (stat == 7) { iRsi7++; }
            if (stat == 8) { iRsi8++; }
            if (stat == 9) { iRsi9++; }
        }

    }

    console.log(iRsi1, iRsi2, iRsi3, iRsi4, iRsi5, iRsi6, iRsi7, iRsi8, iRsi9)

    return wresults

}


// Export default
export default {
    isAdd,
    isReduce,
    isM,
    isW,
    isRecentHigh,
    isRecentLow,
    findW, findDoubleRise
} as const;


export class wresult {
    stockcode: string = "";
    Type: rdType = rdType.unknow;
    rsi7: number = 0;
    rsi14: number = 0;
    price: number = -1;
    MA: number = -1;
    bollDown: number = -1;
    eval: string = "";



}

//涨跌类型
export enum rdType {
    doubleRise = "双升",
    wpatton = "w",
    doubleDown = "双降",
    mpatton = "M",
    unknow = "未知",

}


export enum stockOP {
    buy,
    add,
    hold,
    reduce,
    sell,
}