import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';
import { t_StockDayReport, Prisma, t_Predict } from '@prisma/client';
import dayrptService from '@services/dayrpt-service';
import sinaService from '@services/sinastock-service';
import simService from '@services/simtrade-service';
import { isMpatton, stockOP, txtOP, isWpatton } from '@services/simtrade-service';
import analService from '@services/analysis-service';
import predictService from '@services/predict-service';
import sinastockService from '@services/sinastock-service';
import { type } from 'os';

// Constants
const router = Router();
const { CREATED, OK } = StatusCodes;
const titleSize = "36px";
const txtSize = "18px";
var lastAddPrice: number = 0;
var lastReductPrice: number = 0;
// var isMpatton = false;
var iCountGood = 0;
var iCountBad = 0;
var iCountBadForAdd = 0;
var iCountBadForReduce = 0;
const initMoney = 100000;
const initVol = 5000;
const onceVol = 1000;
var initTotalMoney = 0;
const k = 2;
var CurrentVol = initVol;//当前持股数
var CurrentMoney = initMoney;//可用现金
var CurrentTotalMoney = 0; //当前总资产
var iCountAdd = 0;
var iCountReduce = 0;
var tradelog: Array<simLog> = [];

// Paths
export const p = {
    getbyconditicon: '/allbycondition/:startday/:endday/:stockcode',
    statistics: '/statistics/:startday/:endday/:stockcode',
    findW: '/findw/:endday',
    findwOnline: '/findwon/'

} as const;

//统计并分析 形态
router.get(p.statistics, async (req: Request, res: Response) => {
    const { startday, endday, stockcode } = req.params;
    var begindate: Date = new Date(startday);
    var enddate: Date = new Date(endday);
    if (begindate.getHours() == 0) { begindate.setHours(begindate.getHours() + 8); }
    if (enddate.getHours() == 0) { enddate.setHours(enddate.getHours() + 8); }

    tradelog = [];//清空数组
    initTotalMoney = 0;

    iCountAdd = 0;
    iCountReduce = 0;

    iCountGood = 0;
    iCountBad = 0;
    iCountBadForAdd = 0;
    iCountBadForReduce = 0;

    var txtresult: string = "";
    var dayrpts = await dayrptService.getDayrptByCondition(begindate, enddate, stockcode)

    if (dayrpts.length == 0) {
        return res.status(OK).end();
    }

    //数据统计
    // for (let index = 1; index < dayrpts.length; index++) {
    //     const element = dayrpts[index];
    // }

    // await GetDataAnaly(dayrpts);



    initTotalMoney = CurrentMoney + CurrentVol * Number(dayrpts[0].TradingPriceAvg);
    console.log(dayrpts[0].ReportDay.toDateString(), CurrentMoney + CurrentVol * Number(dayrpts[0].TradingPriceAvg));
    //基于RSI14
    for (let index = 1; index < dayrpts.length; index++) {

        var myoper: stockOP = stockOP.hold;

        if (await simService.isAdd(dayrpts, index)) { myoper = stockOP.add; }

        // if (isBuy(dayrpts, index)) { myoper = stockOP.buy }

        if (simService.isReduce(dayrpts, index)) { myoper = stockOP.reduce }

        // if (isSell(dayrpts, index)) { myoper = stockOP.sell }

        runHQ(dayrpts, index, myoper);

    }

    var temp = CurrentTotalMoney - initTotalMoney;
    var temprate = ((temp / initTotalMoney) * 100).toFixed(2);
    var tempStat = ((iCountGood / (iCountGood + iCountBad)) * 100).toFixed(2) + "%";
    console.log(temp, ((temp / initTotalMoney) * 100).toFixed(2), iCountGood, iCountBad, tempStat, iCountBadForAdd, iCountAdd, iCountBadForReduce, iCountReduce);

    return res.status(OK).json({ temp, temprate, tempStat });
});

router.get(p.findW, async (req: Request, res: Response) => {
    const { endday } = req.params;
    var enddate: Date = new Date(endday);
    enddate.setHours(8, 0, 0, 0);
    // var findresults = await simService.findW(enddate);
    var findresults = await simService.findDoubleRise(enddate);

    var tempCount = findresults.length;

    if (findresults.length == 0) { return res.status(OK).end("not find"); }

    var iCountGood = 0;
    var iRsi1 = 0;
    var iRsi2 = 0;
    var iRsi3 = 0;
    var iRsi4 = 0;
    var iRsi5 = 0;
    var iRsi6 = 0;
    var iRsi7 = 0;
    var iRsi8 = 0;
    var iRsi9 = 0;

    var daytomorrow: Date = new Date(endday);
    daytomorrow.setDate(enddate.getDate() + 1);
    daytomorrow.setHours(8, 0, 0, 0);

    if (daytomorrow.getDay() == 0) { daytomorrow.setDate(daytomorrow.getDate() + 1); }
    if (daytomorrow.getDay() == 6) { daytomorrow.setDate(daytomorrow.getDate() + 2); }

    var evelendday: Date = new Date(daytomorrow);
    evelendday.setHours(8, 0, 0, 0);
    evelendday.setDate(daytomorrow.getDate() + 7);

    findresults = findresults.filter(x => x.rsi7 >= 60);

    for (let index = 0; index < findresults.length; index++) {
        const element = findresults[index];
        // if (element.rsi7>70) {continue;}


        var dayrpsevel = await dayrptService.getDayrptByCondition(daytomorrow, evelendday, element.stockcode);

        if (dayrpsevel.length == 0) { continue }
        dayrpsevel.sort((a, b) => Number(a!.TodayMaxPrice) - Number(b.TodayMaxPrice));

        var maxprice = Number(dayrpsevel[dayrpsevel.length - 1].TodayMaxPrice);


        if (maxprice > element.price && (maxprice - element.price) >= 0.4) {
            // console.log(element.stockcode, element.price, element.rsi7, element.rsi14, element.MA, element.bollDown, element.Type, "good")
            element.eval = "good";
            iCountGood++;

            var stat = parseInt((element.rsi7 / 10).toFixed(2))
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
        else {
            var txtadd = ""
            if (maxprice > element.price) { txtadd = "low" }
            console.log(element.stockcode, element.price, element.rsi7, element.rsi14, element.MA, element.bollDown, element.Type, txtadd)
        }

    }

    var filterCount = findresults.length;
    var tempRate = (iCountGood / filterCount * 100).toFixed(2) + "%";
    console.log(iRsi1, iRsi2, iRsi3, iRsi4, iRsi5, iRsi6, iRsi7, iRsi8, iRsi9)
    return res.status(OK).json({ enddate, tempCount, filterCount, iCountGood, tempRate, findresults });
});


router.get(p.findwOnline, async (req: Request, res: Response) => {
    // const { endday } = req.params;
    var enddate: Date = new Date();
    var yesdate: Date = new Date();
    var txtresult: string = "";
    enddate.setHours(8, 0, 0, 0);
    yesdate.setHours(8, 0, 0, 0);

    var preresults: Array<t_Predict> = []
    var iCountpre = 0;

    //处理周末的情况
    if (enddate.getDay() == 0) { return res.status(OK).end("周末"); }
    if (enddate.getDay() == 6) { return res.status(OK).end("周末"); }

    yesdate.setDate(enddate.getDate() - 1);
    if (enddate.getDay() == 1) { yesdate.setDate(enddate.getDate() - 3); }


    var dayrptsYes = await dayrptService.getDayrptByReportDay(yesdate);
    dayrptsYes = dayrptsYes.filter(x => Number(x.RSI7) < 30 && x.RSI7 != null && Number(x.TodayClosePrice) >= 14 && Number(x.RSI7) >= 0);
    if (dayrptsYes.length == 0) { return res.status(OK).end("Yesterday no data"); }


    for (let index = 0; index < dayrptsYes.length; index++) {
        const element = dayrptsYes[index];
        var startdate = new Date(enddate);
        startdate.setDate(enddate.getDate() - 25);

        //获取当日实时数据
        var mStock = await sinaService.getone(element.StockCode);
        if (!analService.isSameDay(mStock.SearchTime, enddate)) { continue; }



        var dayrpts = await dayrptService.getDayrptByCondition(startdate, enddate, element.StockCode)
        if (dayrpts.length == 0) { continue; }

        //实时数据转RPT
        var mdayrpttoday = await analService.GetTodayDayRpt(enddate, mStock.stockcode, mStock)

        dayrpts.push(mdayrpttoday);
        var rsi = await analService.rsiCalc(dayrpts);



        mdayrpttoday.RSI7 = new Prisma.Decimal(rsi.rsi7);
        mdayrpttoday.RSI14 = new Prisma.Decimal(rsi.rsi14);

        dayrpts[dayrpts.length - 1].RSI7 = mdayrpttoday.RSI7;
        dayrpts[dayrpts.length - 1].RSI14 = mdayrpttoday.RSI14;

        console.log(mdayrpttoday.StockCode, mdayrpttoday.RSI7, dayrpts.length, rsi.rsi14);
        //加入当天实时数据



        if (await simService.isW(dayrpts, dayrpts.length - 1, 30, 29)) {
            if (Number(dayrpts[dayrpts.length - 2].RSI7) <= rsi.rsi7) {
                var mPre: t_Predict = {
                    PredictKey: "",
                    StockCode: element.StockCode,
                    PredictTime: new Date(),
                    Type: "W",
                    CurrentPrice: mdayrpttoday.TodayClosePrice,
                    RSI7: mdayrpttoday.RSI7,
                    RSI14: mdayrpttoday.RSI14,
                    BackTest: "",
                    Memo: ""
                }

                preresults[iCountpre] = mPre;
                iCountpre++;

                txtresult += `| ${element.StockCode}: ${element.TodayClosePrice} ${rsi.rsi7} W  |`

            }
            // console.log(rsi.rsi7, rsi.rsi7expect.toFixed(2), element.StockCode)
        }
        else if (Number(dayrpts[dayrpts.length - 2].RSI7) <= rsi.rsi7 && Number(dayrpts[dayrpts.length - 2].RSI14) <= rsi.rsi14 && rsi.rsi7 > 25) {//双升
            var mPre: t_Predict = {
                PredictKey: "",
                StockCode: element.StockCode,
                PredictTime: new Date(),
                Type: "doublerise",
                CurrentPrice: mdayrpttoday.TodayClosePrice,
                RSI7: mdayrpttoday.RSI7,
                RSI14: mdayrpttoday.RSI14,
                BackTest: "",
                Memo: ""
            }

            preresults[iCountpre] = mPre;
            iCountpre++;

            txtresult += `| ${element.StockCode}: ${element.TodayClosePrice} ${rsi.rsi7} 双升 |`
        }

    }
    if (preresults.length > 0) {
        for (let index = 0; index < preresults.length; index++) {
            const element = preresults[index];
            predictService.addOne(element);
        }
    }


    var tempCount = dayrptsYes.length;

    return res.status(OK).json({ yesdate, enddate, tempCount, txtresult });
});


function runHQ(dayrpts: t_StockDayReport[], index: number, myoper: stockOP) {

    const element = dayrpts[index];
    const elyes = dayrpts[index - 1];
    var reducePrice = Number(element.TradingPriceAvg);
    var todayMaxPrice = Number(element.TodayMaxPrice);
    var choose = "";
    var mLog: simLog = new simLog();


    if (Math.abs(Number(element.TodayClosePrice) - Number(elyes.TodayClosePrice)) >= 2.2) {
        console.log("sudden Price:", element.ReportDay.toDateString())
    }

    if (myoper == stockOP.reduce) {
        if (Math.abs(reducePrice - lastAddPrice) < 0.15) {//幅度小于 0.3 忽略
            if (Math.abs(todayMaxPrice - lastAddPrice) < 0.15) {
                myoper = stockOP.hold;
            } else { reducePrice = todayMaxPrice }

        }
        if (simService.isRecentHigh(dayrpts, index, 2)) {
            reducePrice = todayMaxPrice;
        }
    }

    if (myoper == stockOP.add && Number(element.RSI7) < 30) {
        if (simService.isRecentLow(dayrpts, index, 2)) {
            myoper = stockOP.buy;
        }
    }


    switch (+myoper) {
        case stockOP.add:
            var n = 1;
            if (CurrentMoney > (onceVol * Number(element.TradingPriceAvg))) {
                if (CurrentVol == 0) { n = 3; }
                CurrentVol += n * onceVol;
                CurrentMoney = CurrentMoney - n * onceVol * Number(element.TradingPriceAvg);
                lastAddPrice = Number(element.TradingPriceAvg)
                iCountAdd++;
            }
            break;
        case stockOP.buy:
            if (CurrentMoney >= (k * onceVol * Number(element.TradingPriceAvg))) {
                CurrentVol += (k * onceVol);
                CurrentMoney = CurrentMoney - k * onceVol * Number(element.TradingPriceAvg);
                iCountAdd++;
            } else { console.log("买入资金不足") }
            break;
        case stockOP.sell:
            if (CurrentVol >= k * onceVol) {
                CurrentVol -= (k * onceVol);
                CurrentMoney = CurrentMoney + k * onceVol * Number(element.TradingPriceAvg);
                iCountReduce++;
            } else {
                CurrentVol = 0;
                CurrentMoney = CurrentMoney + CurrentVol * Number(element.TradingPriceAvg);
            }
            break;
        case stockOP.reduce:
            if (CurrentVol >= onceVol) {
                CurrentVol -= onceVol;
                CurrentMoney = CurrentMoney + onceVol * reducePrice;
                lastReductPrice = Number(element.TradingPriceAvg);
                lastAddPrice = 0;
                iCountReduce++;
            }
            break;
        default:
            break;
    }
    choose = GetChooseEval(dayrpts, index, myoper);
    CurrentTotalMoney = CurrentMoney + CurrentVol * Number(element.TradingPriceAvg);
    if (myoper != stockOP.hold) {
        console.log(element.ReportDay.toDateString(), myoper, CurrentMoney, reducePrice, CurrentVol, CurrentTotalMoney, CurrentTotalMoney - initTotalMoney, choose, isMpatton, isWpatton, txtOP);
    }

    // mLog.cost = -1;
    mLog.status = myoper;
    mLog.memo = `${txtOP}|评估：${choose}|M:${isMpatton}|W:${isWpatton}`


}


async function GetDataAnaly(dayrps: t_StockDayReport[]) {
    var mystatus: dayStatus = dayStatus.hold;

    if (dayrps.length < 7) {
        return;
    }

    for (let index = 1; index < dayrps.length; index++) {
        var txtresult = "";
        const element = dayrps[index];
        const eleYesterday = dayrps[index - 1];
        var TodayClosePrice = Number(element.TodayClosePrice);
        var YesterdayClosePrice = Number(eleYesterday.TodayClosePrice);

        if (Number(element.TradingVol) == 0) { mystatus = dayStatus.stop }
        if (TodayClosePrice > YesterdayClosePrice) { mystatus = dayStatus.rise }
        if (TodayClosePrice < YesterdayClosePrice) { mystatus = dayStatus.down }

        txtresult += `${element.ReportDay.toDateString()} RSI7:${element.RSI7} RSI14:${element.RSI14} daystatus:${mystatus.toString()} CLose:${element.TodayClosePrice} MAX:${element.TodayMaxPrice} MIN:${element.TodayMinPrice} `
        txtresult += ` RATEPR:${element.RatePrice}`;
        console.log(txtresult);
    }

}


function GetChooseEval(dayrps: t_StockDayReport[], index: number, myoper: stockOP): string {
    if (index + 2 > dayrps.length) {
        return "";
    }
    var todayPrice = Number(dayrps[index].TradingPriceAvg);
    var tomorrowPrice = Number(dayrps[index + 1].TradingPriceAvg);

    if (myoper == stockOP.add || myoper == stockOP.buy) {
        if (tomorrowPrice > todayPrice) { iCountGood++; return "good" }
        else {
            todayPrice = Number(dayrps[index].TodayMinPrice);
            if (tomorrowPrice > todayPrice) { iCountGood++; return "good" }
            else { iCountBad++; iCountBadForAdd++; return "bad" }
        }
    }
    if (myoper == stockOP.reduce || myoper == stockOP.sell) {
        if (tomorrowPrice <= todayPrice) { iCountGood++; return "good" }
        else {
            tomorrowPrice = Number(dayrps[index + 1].TodayMinPrice);
            if (tomorrowPrice <= todayPrice) { iCountGood++; return "good" }
            else { iCountBad++; iCountBadForReduce++; return "bad" }
        }
    }

    return "";
}


export enum resultStatus {
    good,
    bad,
}


export enum dayStatus {
    rise,
    stop,
    hold,
    down,
}

class simLog {

    reportday!: Date;
    vol: number = -1;
    price: number = -1;
    cash: number = -1;
    status: number = 0;
    memo: string = "";

}

// Export default
export default router;