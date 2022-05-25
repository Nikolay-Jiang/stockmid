import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';
import { t_StockDayReport, Prisma } from '@prisma/client';
import dayrptService from '@services/dayrpt-service';
import sinaService from '@services/sinastock-service';
import simService from '@services/simtrade-service';
import { isMpatton, stockOP } from '@services/simtrade-service';


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

// Paths
export const p = {
    getbyconditicon: '/allbycondition/:startday/:endday/:stockcode',
    statistics: '/statistics/:startday/:endday/:stockcode',
} as const;

//统计并分析 形态
router.get(p.statistics, async (req: Request, res: Response) => {
    const { startday, endday, stockcode } = req.params;
    var begindate: Date = new Date(startday);
    var enddate: Date = new Date(endday);
    if (begindate.getHours() == 0) { begindate.setHours(begindate.getHours() + 8); }
    if (enddate.getHours() == 0) { enddate.setHours(enddate.getHours() + 8); }

    // var startday = new Date("2022-01-01");
    // var endday = new Date("2022-5-25");
    // var stockcode = "sh688981"
    const initMoney = 100000;
    const initVol = 5000;
    const onceVol = 1000;
    var initTotalMoney = 0;
    const k = 2;
    var CurrentVol = initVol;//当前持股数
    var CurrentMoney = initMoney;//可用现金
    var CurrentTotalMoney = 0; //当前总资产

    iCountGood = 0;
    iCountBad = 0;

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
        const element = dayrpts[index];
        const elyes = dayrpts[index - 1];
        var reducePrice = Number(element.TradingPriceAvg);
        var todayMaxPrice = Number(element.TodayMaxPrice);

        var myoper: stockOP = stockOP.hold;
        var choose = "";


        if (simService.isAdd(dayrpts, index)) { myoper = stockOP.add; }

        // if (isBuy(dayrpts, index)) { myoper = stockOP.buy }

        if (simService.isReduce(dayrpts, index)) { myoper = stockOP.reduce }

        // if (isSell(dayrpts, index)) { myoper = stockOP.sell }

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
                if (CurrentMoney > (onceVol * Number(element.TradingPriceAvg))) {
                    CurrentVol += onceVol;
                    CurrentMoney = CurrentMoney - onceVol * Number(element.TradingPriceAvg);
                    lastAddPrice = Number(element.TradingPriceAvg)
                }
                break;
            case stockOP.buy:
                if (CurrentMoney >= (k * onceVol * Number(element.TradingPriceAvg))) {
                    CurrentVol += (k * onceVol);
                    CurrentMoney = CurrentMoney - k * onceVol * Number(element.TradingPriceAvg);
                } else { console.log("买入资金不足") }
                break;
            case stockOP.sell:
                if (CurrentVol >= k * onceVol) {
                    CurrentVol -= (k * onceVol);
                    CurrentMoney = CurrentMoney + k * onceVol * Number(element.TradingPriceAvg);
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
                }
                break;
            default:
                break;
        }
        choose = GetChooseEval(dayrpts, index, myoper);
        CurrentTotalMoney = CurrentMoney + CurrentVol * Number(element.TradingPriceAvg);
        if (myoper != stockOP.hold) {
            console.log(element.ReportDay.toDateString(), myoper, CurrentMoney, reducePrice, CurrentVol, CurrentTotalMoney, CurrentTotalMoney - initTotalMoney, choose, isMpatton);
        }

    }
    var temp = CurrentTotalMoney - initTotalMoney;
    var temprate = ((temp / initTotalMoney) * 100).toFixed(2);
    var tempStat = ((iCountGood / (iCountGood + iCountBad)) * 100).toFixed(2) + "%";
    console.log(temp, ((temp / initTotalMoney) * 100).toFixed(2), iCountGood, iCountBad, tempStat);

    return res.status(OK).json({ temp, temprate, tempStat });
});

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
            else { iCountBad++; return "bad" }
        }
    }
    if (myoper == stockOP.reduce || myoper == stockOP.sell) {
        if (tomorrowPrice <= todayPrice) { iCountGood++; return "good" }
        else { iCountBad++; return "bad" }
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

// Export default
export default router;