import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';
import { t_StockDayReport, t_Predict } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';
import { isMpatton, stockOP, txtOP, isWpatton } from '@services/simtrade-service';
import dayrptService from '@services/dayrpt-service';
import simService from '@services/simtrade-service';
import predictService from '@services/predict-service';
import dayLogService from '@services/daylog-service';



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
    //getbyconditicon: '/allbycondition/:startday/:endday/:stockcode',
    statistics: '/statistics/:startday/:endday/:stockcode',//统计并分析 特定股票在指定日期内的交易情况
    findW: '/findw/:endday',//寻找指定日的YZM
    findwOnline: '/findwon/',//寻找当日的W，并执行写库操作
    findyzm: '/findyzm/:endday',//寻找指定日的YZM
    findyzmon: '/findyzmon/',//寻找当日的YZM，并执行写库操作
    findyzmonbyday: '/findyzmonbyday/:endday',//寻找指定日的YZM，并执行写库操作
    simtradebypredict: '/simfrompredict/:startday'//根据指定日的predict 执行模拟交易


} as const;

/**
 * //根据指定日的predict 执行模拟交易
 */
router.get(p.simtradebypredict, async (req: Request, res: Response) => {
    const { startday } = req.params;
    var startdate: Date = new Date(startday);
    var enddate: Date = new Date(startdate);
    startdate.setHours(8, 0, 0, 0);
    enddate.setDate(startdate.getDate() + 1);
    var iCountLow = 0;
    var iCountAfterNoon = 0;

    console.log(enddate.toDateString());

    var predictresults = await predictService.getPredictByPredictTime(startdate, enddate);

    predictresults = predictresults.filter(x => x.Type == "W");

    if (predictresults.length == 0) { return res.status(OK).end("not find"); }

    for (let index = 0; index < predictresults.length; index++) {
        const element = predictresults[index];


        var tempdaylogs = await dayLogService.getDaylogByCondition(startdate, enddate, element.StockCode!);
        if (tempdaylogs.length == 0) { continue; }

        var bestbuyHour = -1;
        var bestbuyPrice = element.CurrentPrice!;
        var closeprice = element.CurrentPrice!;
        var isLowThenCatch: boolean = false;

        for (let index = 0; index < tempdaylogs.length; index++) {
            const elementDayLog = tempdaylogs[index];
            var currentHour = elementDayLog.SearchTime.getHours();
            var currentPrice = elementDayLog.CurrentPrice!;
            if (currentHour == 9) { continue } //9:35 时刚开盘
            if (currentPrice < bestbuyPrice) {//监测是否有低于
                isLowThenCatch = true;
                bestbuyHour = currentHour;
                bestbuyPrice = currentPrice;
            }


            if (currentHour == 15) {
                closeprice = elementDayLog.CurrentPrice!;
                continue;
            } //收盘

        }
        if (isLowThenCatch) { iCountLow++; }
        if (bestbuyHour >= 14) { iCountAfterNoon++; }

        console.log(element.StockCode, element.Type, element.BackTest, "|", element.CurrentPrice, bestbuyPrice, bestbuyHour, isLowThenCatch, "close:", closeprice);

    }

    console.log("Total:", predictresults.length, "LowTrue:", iCountLow, "AfterNoonBuy:", iCountAfterNoon)

    return res.status(OK).end("page end!");
});


/**
 * 统计并分析 形态
 */
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
    var findresults = await simService.findW(enddate);
    // var findresults = await simService.findDoubleRise(enddate);

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

    // findresults = findresults.filter(x => x.rsi7 >= 60);

    for (let index = 0; index < findresults.length; index++) {
        const element = findresults[index];
        // if (element.rsi7>70) {continue;}


        var dayrpseval = await dayrptService.getDayrptByCondition(daytomorrow, evelendday, element.stockcode);

        if (dayrpseval.length == 0) { continue }
        dayrpseval.sort((a, b) => Number(a!.TodayMaxPrice) - Number(b.TodayMaxPrice));

        var maxprice = Number(dayrpseval[dayrpseval.length - 1].TodayMaxPrice);


        if (maxprice > element.price && (maxprice - element.price) >= 0.4) {
            // console.log(element.stockcode, element.price, element.rsi7, element.rsi14, element.MA, element.bollDown, element.Type, "good")
            if (await simService.isNegativeEvent(element.stockcode)) { element.eval += "|负面"; }
            element.eval += "|Good";
            element.evalprice = Number((maxprice - element.price).toFixed(2))
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
            if (maxprice > element.price) { txtadd = "low"; element.eval += "|Low" }
            element.evalprice = Number((maxprice - element.price).toFixed(2))
            // console.log(element.stockcode, element.price, element.rsi7, element.rsi14, element.MA, element.bollDown, element.Type, txtadd)
        }

    }

    var filterCount = findresults.length;
    var tempRate = (iCountGood / filterCount * 100).toFixed(2) + "%";
    console.log(iRsi1, iRsi2, iRsi3, iRsi4, iRsi5, iRsi6, iRsi7, iRsi8, iRsi9)
    return res.status(OK).json({ enddate, tempCount, filterCount, iCountGood, tempRate, findresults });
});

router.get(p.findyzm, async (req: Request, res: Response) => {
    const { endday } = req.params;
    var enddate: Date = new Date(endday);
    enddate.setHours(8, 0, 0, 0);

    var findresults = await simService.findYZM(enddate);
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


    var yesterday: Date = new Date(endday);
    yesterday.setDate(enddate.getDate() - 1);
    yesterday.setHours(8, 0, 0, 0);

    if (daytomorrow.getDay() == 0) { daytomorrow.setDate(daytomorrow.getDate() + 1); }
    if (daytomorrow.getDay() == 6) { daytomorrow.setDate(daytomorrow.getDate() + 2); }

    var evelendday: Date = new Date(daytomorrow);
    evelendday.setHours(8, 0, 0, 0);
    evelendday.setDate(daytomorrow.getDate() + 7);

    // findresults = findresults.filter(x => x.rsi7 >= 60);

    for (let index = 0; index < findresults.length; index++) {
        const element = findresults[index];

        var dayrptsBefore = await dayrptService.getdayRptCountByDayBefore(yesterday, element.stockcode, 26);
        
        if (dayrptsBefore.length > 0) {
            //规律总结方法？
            var sTag = "";
            sTag = moneyrule1(dayrptsBefore);
            element.eval += sTag;
        }
        

        //评估
        var dayrptsEval = await dayrptService.getdayRptCountByDayAfter(daytomorrow, element.stockcode, 7);

        if (dayrptsEval.length == 0) { continue }
        dayrptsEval.sort((a, b) => Number(a!.TodayMaxPrice) - Number(b.TodayMaxPrice));

        var maxprice = Number(dayrptsEval[dayrptsEval.length - 1].TodayMaxPrice);
        // console.log(dayrptsEval.length,maxprice,element.stockcode);

        if (maxprice > element.price && (maxprice - element.price) >= 0.4) {
            // console.log(element.stockcode, element.price, element.rsi7, element.rsi14, element.MA, element.bollDown, element.Type, "good")
            element.eval += "good";
            element.evalprice = Number((maxprice - element.price).toFixed(2));
            element.evalrate = Number((element.evalprice / element.price * 100).toFixed(2));
            iCountGood++;

            var stat = parseInt((element.rsi7 / 10).toFixed(2))
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
            element.evalprice = Number((maxprice - element.price).toFixed(2));
            element.evalrate = Number((element.evalprice / element.price * 100).toFixed(2));
            if (maxprice > element.price) {
                txtadd = "low";

            }
            console.log(element.stockcode, element.price, element.rsi7, element.rsi14, element.MA, element.bollDown, element.Type, txtadd)
        }



        //基于图形的走势分析
        // if (element.evalrate >= 20) {

        //     var dayrptsBefore = await dayrptService.getdayRptCountByDayBefore(yesterday, element.stockcode, 26);
        //     if (dayrptsBefore.length > 0) {
        //         //规律总结方法？
        //         findmoney(dayrptsBefore)
        //     }
        // }

    }
    findresults.sort((a, b) => (a.eval > b.eval) ? 1 : -1);
    findresults.sort((a, b) => b.evalrate - a.evalrate);

    var filterCount = findresults.length;
    var tempRate = (iCountGood / filterCount * 100).toFixed(2) + "%";
    console.log(iRsi1, iRsi2, iRsi3, iRsi4, iRsi5, iRsi6, iRsi7, iRsi8, iRsi9)
    return res.status(OK).json({ enddate, tempCount, filterCount, iCountGood, tempRate, findresults });
});

/**
 * 基于YZM 进行预测并入库
 */
router.get(p.findyzmon, async (req: Request, res: Response) => {
    var enddate: Date = new Date();
    enddate.setHours(8, 0, 0, 0);

    if (enddate.getDay() == 0 || enddate.getDay() == 6) { return res.status(OK).end("not find"); }
    var findresults = await simService.findYZM(enddate);
    // var findCount = findresults.length;

    if (findresults.length == 0) { return res.status(OK).end("not find"); }

    var ptime = new Date();
    ptime.setHours(8, 15, 0, 0)
    var predicts: Array<t_Predict> = [];
    for (let index = 0; index < findresults.length; index++) {
        const element = findresults[index];

        var mPredict = {
            PredictKey: "",
            StockCode: element.stockcode,
            PredictTime: ptime,
            Type: "YZM",
            CurrentPrice: new Decimal(element.price),
            RSI7: new Decimal(element.rsi7),
            RSI14: new Decimal(element.rsi14),
            BackTest: "",
            Memo: element.eval,
        }

        predicts.push(mPredict)

    }

    if (predicts.length > 0) {
        for (let index = 0; index < predicts.length; index++) {
            const element = predicts[index];
            predictService.addOne(element);
        }
    }

    return res.status(OK).end("accomplish");
});


router.get(p.findyzmonbyday, async (req: Request, res: Response) => {
    const { endday } = req.params;
    var enddate: Date = new Date(endday);
    enddate.setHours(8, 0, 0, 0);

    if (enddate.getDay() == 0 || enddate.getDay() == 6) { return res.status(OK).end("not find"); }


    var findresults = await simService.findYZM(enddate);
    // var findCount = findresults.length;

    if (findresults.length == 0) { return res.status(OK).end("not find"); }

    enddate.setHours(9, 0, 0, 0);

    var predicts: Array<t_Predict> = [];
    for (let index = 0; index < findresults.length; index++) {
        const element = findresults[index];

        var mPredict = {
            PredictKey: "",
            StockCode: element.stockcode,
            PredictTime: enddate,
            Type: "YZM",
            CurrentPrice: new Decimal(element.price),
            RSI7: new Decimal(element.rsi7),
            RSI14: new Decimal(element.rsi14),
            BackTest: "",
            Memo: element.eval,
        }

        predicts.push(mPredict)

    }

    if (predicts.length > 0) {
        for (let index = 0; index < predicts.length; index++) {
            const element = predicts[index];
            predictService.addOne(element);
        }
    }



    return res.status(OK).end("accomplish");
});



router.get(p.findwOnline, async (req: Request, res: Response) => {
    // const { endday } = req.params;
    var enddate: Date = new Date();
    var txtresult: string = "";
    enddate.setHours(8, 0, 0, 0);

    var preresults: Array<t_Predict> = []
    var iCountpre = 0;

    //处理周末的情况
    if (enddate.getDay() == 0) { return res.status(OK).end("周末"); }
    if (enddate.getDay() == 6) { return res.status(OK).end("周末"); }

    var findresults = await simService.findW(enddate, true);
    if (findresults.length == 0) { return res.status(OK).end("not find"); }


    for (let index = 0; index < findresults.length; index++) {
        const element = findresults[index];

        if (await simService.isNegativeEvent(element.stockcode)) { element.eval += "|负面"; }

        var mPre: t_Predict = {
            PredictKey: "",
            StockCode: element.stockcode,
            PredictTime: new Date(),
            Type: "W",
            CurrentPrice: new Decimal(element.price),
            RSI7: new Decimal(element.rsi7),
            RSI14: new Decimal(element.rsi14),
            BackTest: "",
            Memo: element.eval
        }

        preresults[iCountpre] = mPre;
        iCountpre++;
        txtresult += `| ${element.stockcode}: ${element.price} ${element.rsi7} W  |`
    }

    if (preresults.length > 0) {
        for (let index = 0; index < preresults.length; index++) {
            const element = preresults[index];
            predictService.addOne(element);
        }
    }



    return res.status(OK).json({ enddate, txtresult });
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

//总结规律
function findmoney(dayrpts: t_StockDayReport[]) {
    //7天MINPRICE状态
    //7天CLOSEPRICE状态

    var iCountMinRise = 0;
    var iCountMinIgnore = 0;

    var iCountMaxRise = 0;
    var iCountMaxIgnore = 0;

    var iCountCloseRise = 0;
    var iCountCloseIgnore = 0;

    var iTempMin = 0;
    var iTempMax = 0;
    var iTempClose = 0;
    for (let index = 7; index >= 0; index--) {
        const element = dayrpts[index];
        let todaymin = Number(element.TodayMinPrice);
        let todayClose = Number(element.TodayClosePrice);
        let todayMax = Number(element.TodayMaxPrice);

        if (todaymin > iTempMin) {
            if (iTempMin > 0) {
                iCountMinRise++;
            }
        }
        else {
            if (iTempMin - todaymin < 0.5) {//小于一定幅度 忽略
                iCountMinIgnore++;
            }
        }
        iTempMin = todaymin

        if (todayClose > iTempClose) {
            if (iTempClose > 0) { iCountCloseRise++; }
        }
        else {
            if (iTempClose - todayClose < 0.5) { iCountCloseIgnore++ }
        }
        iTempClose = todayClose

        if (todayMax > iTempMax) {
            if (iTempMax > 0) { iCountMaxRise++; }
        }
        else {
            if (iTempMax - todayMax < 0.5) { iCountMaxIgnore++ }
        }
        iTempMax = todayMax



        console.log(element.ReportDay, element.StockCode, todayMax.toFixed(2), element.TodayMinPrice?.toFixed(2), element.TodayClosePrice?.toFixed(2))
    }
    console.log("结论:", iCountMaxRise, iCountMaxIgnore, iCountMinRise, iCountMinIgnore, iCountCloseRise, iCountCloseIgnore)
}

function moneyrule1(dayrpts: t_StockDayReport[]): string {
    //7天MINPRICE状态
    //7天CLOSEPRICE状态
    var stockcode = dayrpts[0].StockCode;
    var iCountMinRise = 0;
    var iCountMinIgnore = 0;

    var iCountMaxRise = 0;
    var iCountMaxIgnore = 0;

    var iCountCloseRise = 0;
    var iCountCloseIgnore = 0;

    var iTempMin = 0;
    var iTempMax = 0;
    var iTempClose = 0;

    for (let index = 7; index >= 0; index--) {
        const element = dayrpts[index];
        let todaymin = Number(element.TodayMinPrice);
        let todayClose = Number(element.TodayClosePrice);
        let todayMax = Number(element.TodayMaxPrice);

        if (todaymin > iTempMin) {
            if (iTempMin > 0) {
                iCountMinRise++;
            }
        }
        else {
            if (iTempMin - todaymin < 0.5) {//小于一定幅度 忽略
                iCountMinIgnore++;
            }
        }
        iTempMin = todaymin

        if (todayClose > iTempClose) {
            if (iTempClose > 0) { iCountCloseRise++; }
            iTempClose = todayClose
        }
        else {
            if (iTempClose - todayClose < 0.5) { iCountCloseIgnore++ }
        }

        if (todayMax > iTempMax) {
            if (iTempMax > 0) { iCountMaxRise++; }
        }
        else {
            if (iTempMax - todayMax < 0.5) { iCountMaxIgnore++ }
        }
        iTempMax = todayMax

        // console.log(element.ReportDay, element.StockCode, todayMax.toFixed(2), element.TodayMinPrice?.toFixed(2), element.TodayClosePrice?.toFixed(2))
    }

    var sTag = "";
    if (iCountMinRise > 3 && iCountCloseRise > 3) {

        if (iCountMaxRise == iCountMinRise && iCountMinRise == iCountCloseRise) {
            sTag = "***";
        }
        if (sTag == "" && iCountMinRise == iCountCloseRise) { sTag = "0**" }
        if (sTag == "" && iCountMaxRise == iCountCloseRise && iCountMinRise >= 5) { sTag = "*5*" }


        console.log("结论:", stockcode, iCountMaxRise, iCountMaxIgnore, iCountMinRise, iCountMinIgnore, iCountCloseRise, iCountCloseIgnore, sTag)
    }



    return sTag;
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