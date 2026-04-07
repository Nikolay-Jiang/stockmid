import { t_StockDayReport, t_Predict, Prisma } from '@prisma/client'
import dayrptService from '@services/dayrpt-service';
import predictService from '@services/predict-service';
import dayLogService from '@services/daylog-service';
import ntfyService from '@services/ntfy-service';
import commonService from '@services/common-service';
import logger from 'jet-logger';
import { wresult, EvalResultBase } from './index';
import { isNegativeEvent, moneyrule1 } from './data-prep';
import { findW, findYZM } from './signal-generator';

export async function simulateFromPredictions(startday: string): Promise<{ total: number; iCountLow: number; iCountAfterNoon: number }> {
    var startdate: Date = new Date(startday);
    var enddate: Date = new Date(startdate);
    startdate.setHours(8, 0, 0, 0);
    enddate.setDate(startdate.getDate() + 1);
    var iCountLow = 0;
    var iCountAfterNoon = 0;

    logger.info(enddate.toDateString());
    var predictresults = await predictService.getPredictByPredictTime(startdate, enddate);
    predictresults = predictresults.filter(x => x.Type == "W");

    if (predictresults.length == 0) { return { total: 0, iCountLow: 0, iCountAfterNoon: 0 }; }

    for (let index = 0; index < predictresults.length; index++) {
        const element = predictresults[index];
        var tempdaylogs = await dayLogService.getDaylogByCondition(startdate, enddate, element.StockCode!);
        if (tempdaylogs.length == 0) { continue; }

        var bestbuyHour = -1;
        var bestbuyPrice = element.CurrentPrice!;
        var closeprice = element.CurrentPrice!;
        var isLowThenCatch: boolean = false;

        for (let j = 0; j < tempdaylogs.length; j++) {
            const elementDayLog = tempdaylogs[j];
            var currentHour = elementDayLog.SearchTime!.getHours();
            var currentPrice = elementDayLog.CurrentPrice!;
            if (currentHour == 9) { continue; }
            if (currentPrice < bestbuyPrice) {
                isLowThenCatch = true;
                bestbuyHour = currentHour;
                bestbuyPrice = currentPrice;
            }
            if (currentHour == 15) { closeprice = elementDayLog.CurrentPrice!; continue; }
        }
        if (isLowThenCatch) { iCountLow++; }
        if (bestbuyHour >= 14) { iCountAfterNoon++; }
        logger.info([element.StockCode, element.Type, element.BackTest, "|", element.CurrentPrice, bestbuyPrice, bestbuyHour, isLowThenCatch, "close:", closeprice].join(' '));
    }
    logger.info(["Total:", predictresults.length, "LowTrue:", iCountLow, "AfterNoonBuy:", iCountAfterNoon].join(' '));
    return { total: predictresults.length, iCountLow, iCountAfterNoon };
}

export async function evaluateFindW(endday: string): Promise<EvalResultBase | null> {
    var enddate: Date = new Date(endday);
    enddate.setHours(8, 0, 0, 0);
    var findresults = await findW(enddate);
    var tempCount = findresults.length;
    if (findresults.length == 0) { return null; }

    var iCountGood = 0;
    var rsiDist = [0, 0, 0, 0, 0, 0, 0, 0, 0];

    var daytomorrow: Date = new Date(endday);
    daytomorrow.setDate(enddate.getDate() + 1);
    daytomorrow.setHours(8, 0, 0, 0);
    if (daytomorrow.getDay() == 0) { daytomorrow.setDate(daytomorrow.getDate() + 1); }
    if (daytomorrow.getDay() == 6) { daytomorrow.setDate(daytomorrow.getDate() + 2); }

    var evelendday: Date = new Date(daytomorrow);
    evelendday.setHours(8, 0, 0, 0);
    evelendday.setDate(daytomorrow.getDate() + 7);

    for (let index = 0; index < findresults.length; index++) {
        const element = findresults[index];
        var dayrpseval = await dayrptService.getDayrptByCondition(daytomorrow, evelendday, element.stockcode);
        if (dayrpseval.length == 0) { continue; }
        dayrpseval.sort((a, b) => Number(a!.TodayMaxPrice) - Number(b.TodayMaxPrice));
        var maxprice = Number(dayrpseval[dayrpseval.length - 1].TodayMaxPrice);
        if (maxprice > element.price && (maxprice - element.price) >= 0.4) {
            if (await isNegativeEvent(element.stockcode)) { element.eval += "|负面"; }
            element.eval += "|Good";
            element.evalprice = Number((maxprice - element.price).toFixed(2));
            iCountGood++;
            var stat = parseInt((element.rsi7 / 10).toFixed(2));
            if (stat >= 1 && stat <= 9) { rsiDist[stat - 1]++; }
        } else {
            if (maxprice > element.price) { element.eval += "|Low"; }
            element.evalprice = Number((maxprice - element.price).toFixed(2));
        }
    }

    var filterCount = findresults.length;
    var tempRate = (iCountGood / filterCount * 100).toFixed(2) + "%";
    logger.info(rsiDist.join(' '));
    return { enddate, tempCount, filterCount, iCountGood, tempRate, findresults };
}

export async function evaluateFindYZM(endday: string): Promise<(EvalResultBase & { dayrptsRule: wresult[] }) | null> {
    var enddate: Date = new Date(endday);
    enddate.setHours(8, 0, 0, 0);
    var findresults = await findYZM(enddate);
    var tempCount = findresults.length;
    if (findresults.length == 0) { return null; }

    var iCountGood = 0;
    var rsiDist = [0, 0, 0, 0, 0, 0, 0, 0, 0];

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
    var findresultsRule: Array<wresult> = [];

    for (let index = 0; index < findresults.length; index++) {
        const element = findresults[index];
        var dayrptsBefore = await dayrptService.getdayRptCountByDayBefore(yesterday, element.stockcode, 26);
        if (dayrptsBefore.length > 0) {
            var sTag = moneyrule1(dayrptsBefore);
            element.eval += sTag;
            if (sTag != "") { findresultsRule.push(element); }
        }
        var dayrptsEval = await dayrptService.getdayRptCountByDayAfter(daytomorrow, element.stockcode, 7);
        if (dayrptsEval.length == 0) { continue; }
        dayrptsEval.sort((a, b) => Number(a!.TodayMaxPrice) - Number(b.TodayMaxPrice));
        var maxprice = Number(dayrptsEval[dayrptsEval.length - 1].TodayMaxPrice);
        if (maxprice > element.price && (maxprice - element.price) >= 0.4) {
            element.eval += "|good";
            element.evalprice = Number((maxprice - element.price).toFixed(2));
            element.evalrate = Number((element.evalprice / element.price * 100).toFixed(2));
            iCountGood++;
            var stat = parseInt((element.rsi7 / 10).toFixed(2));
            if (stat >= 1 && stat <= 9) { rsiDist[stat - 1]++; }
        } else {
            element.evalprice = Number((maxprice - element.price).toFixed(2));
            element.evalrate = Number((element.evalprice / element.price * 100).toFixed(2));
            if (maxprice > element.price) {
                logger.info([element.stockcode, element.price, element.rsi7, element.rsi14, element.MA, element.bollDown, element.Type, "low"].join(' '));
            }
        }
    }
    findresults.sort((a, b) => (a.eval > b.eval) ? 1 : -1);
    findresults.sort((a, b) => b.evalrate - a.evalrate);
    findresultsRule.sort((a, b) => (b.price - a.price));

    var filterCount = findresults.length;
    var tempRate = (iCountGood / filterCount * 100).toFixed(2) + "%";
    logger.info(rsiDist.join(' '));
    return { enddate, tempCount, filterCount, iCountGood, tempRate, findresults, dayrptsRule: findresultsRule };
}

export async function findAndSaveYZMOnline(): Promise<{ count: number; message: string } | null> {
    var enddate: Date = new Date();
    enddate.setHours(8, 0, 0, 0);
    var yesterday: Date = new Date(enddate);
    yesterday.setDate(enddate.getDate() - 1);
    yesterday.setHours(8, 0, 0, 0);

    if (enddate.getDay() == 0 || enddate.getDay() == 6) { return null; }
    var findresults = await findYZM(enddate);
    if (findresults.length == 0) { return null; }

    var ptime = new Date();
    ptime.setHours(8, 15, 0, 0);
    var predicts: Array<t_Predict> = [];
    for (let index = 0; index < findresults.length; index++) {
        const element = findresults[index];
        var dayrptsBefore = await dayrptService.getdayRptCountByDayBefore(yesterday, element.stockcode, 26);
        if (dayrptsBefore.length > 0) {
            var sTag = moneyrule1(dayrptsBefore);
            element.eval += sTag;
        }
        predicts.push({
            PredictKey: "",
            StockCode: element.stockcode,
            PredictTime: ptime,
            Type: "YZM",
            CurrentPrice: new Prisma.Decimal(element.price),
            RSI7: new Prisma.Decimal(element.rsi7),
            RSI14: new Prisma.Decimal(element.rsi14),
            BackTest: "",
            Memo: element.eval,
        });
    }

    var message = commonService.convertDatetoStr(enddate) + "yzm算法今日生成:" + predicts.length;
    if (predicts.length > 0) {
        for (let index = 0; index < predicts.length; index++) {
            predictService.addOne(predicts[index]);
        }
    }
    await ntfyService.sendPostRequest(message);
    return { count: predicts.length, message };
}

export async function findAndSaveYZMByDay(endday: string): Promise<{ count: number } | null> {
    var enddate: Date = new Date(endday);
    enddate.setHours(8, 0, 0, 0);
    if (enddate.getDay() == 0 || enddate.getDay() == 6) { return null; }

    var findresults = await findYZM(enddate);
    if (findresults.length == 0) { return null; }

    enddate.setHours(9, 0, 0, 0);
    var predicts: Array<t_Predict> = [];
    for (let index = 0; index < findresults.length; index++) {
        const element = findresults[index];
        predicts.push({
            PredictKey: "",
            StockCode: element.stockcode,
            PredictTime: enddate,
            Type: "YZM",
            CurrentPrice: new Prisma.Decimal(element.price),
            RSI7: new Prisma.Decimal(element.rsi7),
            RSI14: new Prisma.Decimal(element.rsi14),
            BackTest: "",
            Memo: element.eval,
        });
    }

    if (predicts.length > 0) {
        for (let index = 0; index < predicts.length; index++) {
            predictService.addOne(predicts[index]);
        }
    }
    return { count: predicts.length };
}

export async function findAndSaveWOnline(): Promise<{ enddate: Date; txtresult: string } | null> {
    var enddate: Date = new Date();
    enddate.setHours(8, 0, 0, 0);

    if (enddate.getDay() == 0 || enddate.getDay() == 6) { return null; }
    var findresults = await findW(enddate, true);
    if (findresults.length == 0) { return null; }

    var txtresult: string = "";
    var preresults: Array<t_Predict> = [];

    for (let index = 0; index < findresults.length; index++) {
        const element = findresults[index];
        if (await isNegativeEvent(element.stockcode)) { element.eval += "|负面"; }
        preresults.push({
            PredictKey: "",
            StockCode: element.stockcode,
            PredictTime: new Date(),
            Type: "W",
            CurrentPrice: new Prisma.Decimal(element.price),
            RSI7: new Prisma.Decimal(element.rsi7),
            RSI14: new Prisma.Decimal(element.rsi14),
            BackTest: "",
            Memo: element.eval,
        });
        txtresult += `| ${element.stockcode}: ${element.price} ${element.rsi7} W  |`;
    }

    var message = commonService.convertDatetoStr(enddate) + "W算法今日生成:" + preresults.length;
    if (preresults.length > 0) {
        for (let index = 0; index < preresults.length; index++) {
            predictService.addOne(preresults[index]);
        }
        if (preresults.length <= 5) { message += "; 数量较少建议减仓或者观望"; }
        if (preresults.length >= 15) { message += "; 建议增仓!"; }
    }
    await ntfyService.sendPostRequest(message);
    return { enddate, txtresult };
}
