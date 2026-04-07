import { t_StockDayReport } from '@prisma/client'
import dayrptService from '@services/dayrpt-service';
import { PORTFOLIO_DEFAULTS } from '@shared/constants/trading-constants';
import logger from 'jet-logger';
import { stockOP, simLog } from './index';
import { isRecentHigh, isRecentLow } from './data-prep';
import { isAdd, isReduce, isMpatton, isWpatton, txtOP } from './calculator';

// ============================================================
// Portfolio simulation state (extracted from router)
// ============================================================

var lastAddPrice: number = 0;
var lastReductPrice: number = 0;
var pfCountGood = 0;
var pfCountBad = 0;
var pfCountBadForAdd = 0;
var pfCountBadForReduce = 0;
var initTotalMoney = 0;
const pfK = 2;
var CurrentVol: number = PORTFOLIO_DEFAULTS.INIT_VOL;
var CurrentMoney: number = PORTFOLIO_DEFAULTS.INIT_MONEY;
var CurrentTotalMoney = 0;
var pfCountAdd = 0;
var pfCountReduce = 0;
var tradelog: Array<simLog> = [];

export function resetPortfolioState(): void {
    lastAddPrice = 0;
    lastReductPrice = 0;
    pfCountGood = 0;
    pfCountBad = 0;
    pfCountBadForAdd = 0;
    pfCountBadForReduce = 0;
    initTotalMoney = 0;
    CurrentVol = PORTFOLIO_DEFAULTS.INIT_VOL;
    CurrentMoney = PORTFOLIO_DEFAULTS.INIT_MONEY;
    CurrentTotalMoney = 0;
    pfCountAdd = 0;
    pfCountReduce = 0;
    tradelog = [];
}

// ============================================================
// Helper functions extracted from router
// ============================================================

export function runHQ(dayrpts: t_StockDayReport[], index: number, myoper: stockOP): void {
    const element = dayrpts[index];
    const elyes = dayrpts[index - 1];
    var reducePrice = Number(element.TradingPriceAvg);
    var todayMaxPrice = Number(element.TodayMaxPrice);
    var mLog: simLog = new simLog();

    if (Math.abs(Number(element.TodayClosePrice) - Number(elyes.TodayClosePrice)) >= 2.2) {
        logger.info(["sudden Price:", element.ReportDay.toDateString()].join(' '));
    }

    if (myoper == stockOP.reduce) {
        if (Math.abs(reducePrice - lastAddPrice) < 0.15) {
            if (Math.abs(todayMaxPrice - lastAddPrice) < 0.15) {
                myoper = stockOP.hold;
            } else { reducePrice = todayMaxPrice; }
        }
        if (isRecentHigh(dayrpts, index, 2)) {
            reducePrice = todayMaxPrice;
        }
    }

    if (myoper == stockOP.add && Number(element.RSI7) < 30) {
        if (isRecentLow(dayrpts, index, 2)) {
            myoper = stockOP.buy;
        }
    }

    switch (+myoper) {
        case stockOP.add:
            var n = 1;
            if (CurrentMoney > (PORTFOLIO_DEFAULTS.ONCE_VOL * Number(element.TradingPriceAvg))) {
                if (CurrentVol == 0) { n = 3; }
                CurrentVol += n * PORTFOLIO_DEFAULTS.ONCE_VOL;
                CurrentMoney = CurrentMoney - n * PORTFOLIO_DEFAULTS.ONCE_VOL * Number(element.TradingPriceAvg);
                lastAddPrice = Number(element.TradingPriceAvg);
                pfCountAdd++;
            }
            break;
        case stockOP.buy:
            if (CurrentMoney >= (pfK * PORTFOLIO_DEFAULTS.ONCE_VOL * Number(element.TradingPriceAvg))) {
                CurrentVol += (pfK * PORTFOLIO_DEFAULTS.ONCE_VOL);
                CurrentMoney = CurrentMoney - pfK * PORTFOLIO_DEFAULTS.ONCE_VOL * Number(element.TradingPriceAvg);
                pfCountAdd++;
            } else { logger.info("买入资金不足"); }
            break;
        case stockOP.sell:
            if (CurrentVol >= pfK * PORTFOLIO_DEFAULTS.ONCE_VOL) {
                CurrentVol -= (pfK * PORTFOLIO_DEFAULTS.ONCE_VOL);
                CurrentMoney = CurrentMoney + pfK * PORTFOLIO_DEFAULTS.ONCE_VOL * Number(element.TradingPriceAvg);
                pfCountReduce++;
            } else {
                CurrentMoney = CurrentMoney + CurrentVol * Number(element.TradingPriceAvg);
                CurrentVol = 0;
            }
            break;
        case stockOP.reduce:
            if (CurrentVol >= PORTFOLIO_DEFAULTS.ONCE_VOL) {
                CurrentVol -= PORTFOLIO_DEFAULTS.ONCE_VOL;
                CurrentMoney = CurrentMoney + PORTFOLIO_DEFAULTS.ONCE_VOL * reducePrice;
                lastReductPrice = Number(element.TradingPriceAvg);
                lastAddPrice = 0;
                pfCountReduce++;
            }
            break;
        default:
            break;
    }
    var choose = getChooseEval(dayrpts, index, myoper);
    CurrentTotalMoney = CurrentMoney + CurrentVol * Number(element.TradingPriceAvg);
    if (myoper != stockOP.hold) {
        logger.info([element.ReportDay.toDateString(), myoper, CurrentMoney, reducePrice, CurrentVol, CurrentTotalMoney, CurrentTotalMoney - initTotalMoney, choose, isMpatton, isWpatton, txtOP].join(' '));
    }
    mLog.status = myoper;
    mLog.memo = `${txtOP}|评估：${choose}|M:${isMpatton}|W:${isWpatton}`;
}

export function getChooseEval(dayrps: t_StockDayReport[], index: number, myoper: stockOP): string {
    if (index + 2 > dayrps.length) { return ""; }
    var todayPrice = Number(dayrps[index].TradingPriceAvg);
    var tomorrowPrice = Number(dayrps[index + 1].TradingPriceAvg);

    if (myoper == stockOP.add || myoper == stockOP.buy) {
        if (tomorrowPrice > todayPrice) { pfCountGood++; return "good"; }
        else {
            todayPrice = Number(dayrps[index].TodayMinPrice);
            if (tomorrowPrice > todayPrice) { pfCountGood++; return "good"; }
            else { pfCountBad++; pfCountBadForAdd++; return "bad"; }
        }
    }
    if (myoper == stockOP.reduce || myoper == stockOP.sell) {
        if (tomorrowPrice <= todayPrice) { pfCountGood++; return "good"; }
        else {
            tomorrowPrice = Number(dayrps[index + 1].TodayMinPrice);
            if (tomorrowPrice <= todayPrice) { pfCountGood++; return "good"; }
            else { pfCountBad++; pfCountBadForReduce++; return "bad"; }
        }
    }
    return "";
}

export async function runStatistics(startday: string, endday: string, stockcode: string): Promise<{ temp: number; temprate: string; tempStat: string } | null> {
    var begindate: Date = new Date(startday);
    var enddate: Date = new Date(endday);
    if (begindate.getHours() == 0) { begindate.setHours(begindate.getHours() + 8); }
    if (enddate.getHours() == 0) { enddate.setHours(enddate.getHours() + 8); }

    resetPortfolioState();

    var dayrpts = await dayrptService.getDayrptByCondition(begindate, enddate, stockcode);
    if (dayrpts.length == 0) { return null; }

    initTotalMoney = CurrentMoney + CurrentVol * Number(dayrpts[0].TradingPriceAvg);
    logger.info([dayrpts[0].ReportDay.toDateString(), initTotalMoney].join(' '));

    for (let index = 1; index < dayrpts.length; index++) {
        var myoper: stockOP = stockOP.hold;
        if (await isAdd(dayrpts, index)) { myoper = stockOP.add; }
        if (isReduce(dayrpts, index)) { myoper = stockOP.reduce; }
        runHQ(dayrpts, index, myoper);
    }

    var temp = CurrentTotalMoney - initTotalMoney;
    var temprate = ((temp / initTotalMoney) * 100).toFixed(2);
    var tempStat = ((pfCountGood / (pfCountGood + pfCountBad)) * 100).toFixed(2) + "%";
    logger.info([temp, temprate, pfCountGood, pfCountBad, tempStat, pfCountBadForAdd, pfCountAdd, pfCountBadForReduce, pfCountReduce].join(' '));
    return { temp, temprate, tempStat };
}
