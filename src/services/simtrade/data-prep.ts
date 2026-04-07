import { t_StockDayReport } from '@prisma/client'
import tencentService from '@services/tencentstock-service';
import dayrptService from '@services/dayrpt-service';
import logger from 'jet-logger';
import { TIME_WINDOWS } from '@shared/constants/trading-constants';
import { wresult, rdType } from './index';

var iRsi1 = 0;
var iRsi2 = 0;
var iRsi3 = 0;
var iRsi4 = 0;
var iRsi5 = 0;
var iRsi6 = 0;
var iRsi7 = 0;
var iRsi8 = 0;
var iRsi9 = 0;

//检查大幅波动
export function validTremor(dayrpts: t_StockDayReport[], rate: number = 2): boolean {
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
        var iTemp = iRatePrice / yesPrice * 100

        if (iTemp >= iTremor) { return true; }
    }

    return false;
}

//检查RSI7 区段内是否都小于20
export function isUnderLow(iFirst: number, iSec: number, dayrpts: t_StockDayReport[]): boolean {
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
export function isRecentHigh(dayrps: t_StockDayReport[], index: number, dayCount: number): boolean {
    if ((index - dayCount) >= 0) {//计算三天
        var element = dayrps[index];
        var dayrpsTemp = dayrps.slice(index - dayCount, index);
        dayrpsTemp.sort((a, b) => Number(a!.TodayMaxPrice) - Number(b!.TodayMaxPrice));

        if (Number(dayrpsTemp[dayrpsTemp.length - 1].TodayMaxPrice) <= Number(element.TodayMaxPrice)) {
            // logger.info("recentHI!!!")
            return true;
        }

    }

    return false;
}

/*
* 短期低位判断
*/
export function isRecentLow(dayrps: t_StockDayReport[], index: number, dayCount: number): boolean {
    if ((index - dayCount) >= 0) {
        var element = dayrps[index];
        var dayrpsTemp = dayrps.slice(index - dayCount, index);
        dayrpsTemp.sort((a, b) => Number(a!.TodayMinPrice) - Number(b.TodayMinPrice));
        if (Number(dayrpsTemp[0].TodayMinPrice) >= Number(element.TodayMinPrice)) {
            logger.info("recentLow!!!")
            return true;
        }

    }

    return false;
}

export function isBuy(dayrpts: t_StockDayReport[], index: number): boolean {
    return false
}

export function isSell(dayrpts: t_StockDayReport[], index: number): boolean {
    return false
}

export async function getLasttradeDay(enddate: Date): Promise<Date> {
    var yesdate: Date = new Date(enddate);
    yesdate.setHours(8, 0, 0, 0);
    yesdate.setDate(enddate.getDate() - 1)

    if (yesdate.getDay() == 0) {//周日
        yesdate.setDate(yesdate.getDate() - 2)
    }
    if (yesdate.getDay() == 6) {//周六
        yesdate.setDate(yesdate.getDate() - 1)
    }

    while (await tencentService.isHoliday(yesdate)) {
        yesdate.setDate(yesdate.getDate() - 1)
    }
    return yesdate;
}

/**
 * 1个月内是否存在负面事件
 * @param stockcode 
 * @returns 
 */
export async function isNegativeEvent(stockcode: string): Promise<boolean> {
    var notices = await tencentService.getnotice(stockcode)

    if (notices.length == 0) { return false; }
    var today = new Date();
    today.setHours(8, 0, 0, 0);

    var daylimit = new Date();
    daylimit.setDate(today.getDate() - TIME_WINDOWS.NOTICE_CHECK_DAYS);
    // logger.info(["daylim",daylimit.toDateString()].join(' '));
    notices = notices.filter(x => {
        let itemdate = new Date(x.notice_date).getTime();
        return itemdate > daylimit.getTime();
        // logger.info([itemdate,daylimit.getTime()].join(' '))
    })

    // logger.info(["notices", notices.length].join(' '));
    if (notices.length == 0) { return false; }

    var results = notices.filter(x => x.title_ch.indexOf("关注函") > -1 || x.title_ch.indexOf("问询函") > -1)
    if (results.length > 0) { return true; }

    return false;
}

export function getDataAnalysis(dayrps: t_StockDayReport[]): void {
    var mystatus = 2; // dayStatus.hold equivalent
    if (dayrps.length < 7) { return; }
    for (let index = 1; index < dayrps.length; index++) {
        var txtresult = "";
        const element = dayrps[index];
        const eleYesterday = dayrps[index - 1];
        var TodayClosePrice = Number(element.TodayClosePrice);
        var YesterdayClosePrice = Number(eleYesterday.TodayClosePrice);
        if (Number(element.TradingVol) == 0) { mystatus = 1; }
        if (TodayClosePrice > YesterdayClosePrice) { mystatus = 0; }
        if (TodayClosePrice < YesterdayClosePrice) { mystatus = 3; }
        txtresult += `${element.ReportDay.toDateString()} RSI7:${element.RSI7} RSI14:${element.RSI14} daystatus:${mystatus.toString()} CLose:${element.TodayClosePrice} MAX:${element.TodayMaxPrice} MIN:${element.TodayMinPrice} `;
        txtresult += ` RATEPR:${element.RatePrice}`;
        logger.info(txtresult);
    }
}

export function findmoneyAnalysis(dayrpts: t_StockDayReport[]): void {
    var iCountMinRise = 0; var iCountMinIgnore = 0;
    var iCountMaxRise = 0; var iCountMaxIgnore = 0;
    var iCountCloseRise = 0; var iCountCloseIgnore = 0;
    var iTempMin = 0; var iTempMax = 0; var iTempClose = 0;
    for (let index = 7; index >= 0; index--) {
        const element = dayrpts[index];
        let todaymin = Number(element.TodayMinPrice);
        let todayClose = Number(element.TodayClosePrice);
        let todayMax = Number(element.TodayMaxPrice);
        if (todaymin > iTempMin) { if (iTempMin > 0) { iCountMinRise++; } }
        else { if (iTempMin - todaymin < 0.5) { iCountMinIgnore++; } }
        iTempMin = todaymin;
        if (todayClose > iTempClose) { if (iTempClose > 0) { iCountCloseRise++; } }
        else { if (iTempClose - todayClose < 0.5) { iCountCloseIgnore++; } }
        iTempClose = todayClose;
        if (todayMax > iTempMax) { if (iTempMax > 0) { iCountMaxRise++; } }
        else { if (iTempMax - todayMax < 0.5) { iCountMaxIgnore++; } }
        iTempMax = todayMax;
        logger.info([element.ReportDay, element.StockCode, todayMax.toFixed(2), element.TodayMinPrice?.toFixed(2), element.TodayClosePrice?.toFixed(2)].join(' '));
    }
    logger.info(["结论:", iCountMaxRise, iCountMaxIgnore, iCountMinRise, iCountMinIgnore, iCountCloseRise, iCountCloseIgnore].join(' '));
}

export function moneyrule1(dayrpts: t_StockDayReport[]): string {
    var stockcode = dayrpts[0].StockCode;
    var iCountMinRise = 0; var iCountMinIgnore = 0;
    var iCountMaxRise = 0; var iCountMaxIgnore = 0;
    var iCountCloseRise = 0; var iCountCloseIgnore = 0;
    var iTempMin = 0; var iTempMax = 0; var iTempClose = 0;
    for (let index = 7; index >= 0; index--) {
        const element = dayrpts[index];
        let todaymin = Number(element.TodayMinPrice);
        let todayClose = Number(element.TodayClosePrice);
        let todayMax = Number(element.TodayMaxPrice);
        if (todaymin > iTempMin) { if (iTempMin > 0) { iCountMinRise++; } }
        else { if (iTempMin - todaymin < 0.5) { iCountMinIgnore++; } }
        iTempMin = todaymin;
        if (todayClose > iTempClose) {
            if (iTempClose > 0) { iCountCloseRise++; }
            iTempClose = todayClose;
        }
        else { if (iTempClose - todayClose < 0.5) { iCountCloseIgnore++; } }
        if (todayMax > iTempMax) { if (iTempMax > 0) { iCountMaxRise++; } }
        else { if (iTempMax - todayMax < 0.5) { iCountMaxIgnore++; } }
        iTempMax = todayMax;
    }
    var sTag = "";
    if (iCountMinRise > 3 && iCountCloseRise > 3) {
        if (iCountMaxRise == iCountMinRise && iCountMinRise == iCountCloseRise) { sTag = "|***"; }
        if (sTag == "" && iCountMinRise == iCountCloseRise) { sTag = "|" + iCountMaxRise.toString().substring(0, 1) + "**"; }
        if (sTag == "" && iCountMaxRise == iCountCloseRise && iCountMinRise >= 5) { sTag = "|*5*"; }
        if (sTag == "" && iCountMaxRise == iCountMinRise) { sTag = "|**" + iCountCloseRise.toString().substring(0, 1); }
    }
    return sTag;
}

/**
 * 寻找双升
 * @param enddate 
 * @returns 
 */
export async function findDoubleRise(enddate: Date): Promise<wresult[]> {
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
            // logger.info(stat)
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

    logger.info([iRsi1, iRsi2, iRsi3, iRsi4, iRsi5, iRsi6, iRsi7, iRsi8, iRsi9].join(' '))

    return wresults

}
