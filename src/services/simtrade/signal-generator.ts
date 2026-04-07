import { t_StockDayReport, Prisma } from '@prisma/client'
import dayrptService from '@services/dayrpt-service';
import analService from '@services/analysis-service';
import tencentService from '@services/tencentstock-service';
import commonService from '@services/common-service';
import { RSI_THRESHOLDS, PRICE_THRESHOLDS, BOLLINGER_THRESHOLDS, TIME_WINDOWS, W_DETECT_LOOSE } from '@shared/constants/trading-constants';
import logger from 'jet-logger';
import { wresult, rdType } from './index';
import { validTremor, getLasttradeDay } from './data-prep';
import { isW, wStr } from './calculator';

export async function findW(enddate: Date, needtoday: boolean = false): Promise<wresult[]> {

    enddate.setHours(8, 0, 0, 0);
    var wresults: Array<wresult> = [];
    var iResult = 0;

    var isholiday = await tencentService.isHoliday(enddate);
    if (isholiday) { return wresults; };//判断当天是否为节假日

    var yesdate: Date = await getLasttradeDay(enddate)
    var dayrptsYes = await dayrptService.getDayrptByReportDay(yesdate);

    if (dayrptsYes.length == 0) { return wresults; }
    //logger.info(yesdate.toDateString())

    dayrptsYes = dayrptsYes.filter(x => Number(x.RSI7) < RSI_THRESHOLDS.WEAK_ZONE && x.RSI7 != null && Number(x.TodayClosePrice) >= PRICE_THRESHOLDS.MIN_W_CANDIDATE && Number(x.RSI7) >= 0);
    // dayrptsYes = dayrptsYes.filter(x => Number(x.RSI7) >= 20 && x.RSI7 != null && Number(x.TodayClosePrice) >= 12 && Number(x.RSI7) >= 0);

    if (dayrptsYes.length == 0) { return wresults; }

    var startdate = new Date(enddate);
    startdate.setDate(enddate.getDate() - TIME_WINDOWS.W_LOOKBACK_DAYS);
    var dayrpts = await dayrptService.getDayrptByReportDay2(startdate, enddate);

    if (dayrpts.length == 0) { return wresults; }

    for (let index = 0; index < dayrptsYes.length; index++) {
        const element = dayrptsYes[index];

        var dayrptsTemp = dayrpts.filter(x => x.StockCode == element.StockCode);
        if (dayrptsTemp.length == 0) { continue; }

        if (needtoday) {
            //获取当日实时数据
            var mStock = await tencentService.getone(element.StockCode);

            if (!commonService.isSameDay(dayrptsTemp[dayrptsTemp.length - 1].ReportDay, mStock.SearchTime)) {//确认没有当日数据
                if (commonService.isSameDay(mStock.SearchTime, enddate)) {//如果查询日期和最后天相同
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
            if (!commonService.isSameDay(dayrptsTemp[dayrptsTemp.length - 1].ReportDay, enddate)) { continue; }//排除当日无数据的情况    
        }


        var todayRSI7 = Number(dayrptsTemp[dayrptsTemp.length - 1].RSI7);
        var todayRSI14 = Number(dayrptsTemp[dayrptsTemp.length - 1].RSI14);
        var todayPrice = Number(dayrptsTemp[dayrptsTemp.length - 1].TradingPriceAvg);
        var todayWidth = Number(dayrptsTemp[dayrptsTemp.length - 1].WIDTH);
        var todayBB = Number(dayrptsTemp[dayrptsTemp.length - 1].BB);
        var mResult = new wresult();

        var ratedatas = await analService.GetRateData(dayrptsTemp);
        var bestRate = ratedatas[ratedatas.length - 1].rateprice;


        if (todayWidth > BOLLINGER_THRESHOLDS.MAX_WIDTH) { continue; }
        if (todayBB > BOLLINGER_THRESHOLDS.MAX_BB) { continue; }
        if (bestRate < 0.2) { continue; }



        if (await isW(dayrptsTemp, dayrptsTemp.length - 1, W_DETECT_LOOSE.RSI_DECIDE, W_DETECT_LOOSE.RSI_AVG, false)) {
            if (Number(element.RSI7) <= todayRSI7) {
                mResult.stockcode = element.StockCode
                mResult.rsi7 = todayRSI7;
                mResult.rsi14 = todayRSI14;
                mResult.Type = rdType.wpatton;
                mResult.price = todayPrice;
                mResult.MA = Number(dayrptsTemp[dayrptsTemp.length - 1].MA);
                mResult.bollDown = Number(dayrptsTemp[dayrptsTemp.length - 1].bollDown);
                mResult.bb = Number(dayrptsTemp[dayrptsTemp.length - 1].BB);
                mResult.width = Number(dayrptsTemp[dayrptsTemp.length - 1].WIDTH);
                mResult.eval = wStr;
                wresults[iResult] = mResult;
                iResult++;
            }
            logger.info([todayRSI7, todayRSI14, element.StockCode, mResult.Type, bestRate].join(' '))

        }

    }
    return wresults;
}

/*
* 该算法灵感来源于 300415 从 2022.6.1-2022.6.8 RSI 持续双升 并走出高位的状态
*/
export async function findYZM(enddate: Date): Promise<wresult[]> {

    //RSI7,14   从50+ 平稳上升到 60+ 再上升至 70,且连续穿透上线
    //查找前一天 双 60+ 的并往前计算
    var wresults: Array<wresult> = [];
    enddate.setHours(8, 0, 0, 0);
    var isholiday = await tencentService.isHoliday(enddate);
    if (isholiday) { return wresults; };

    var yesdate: Date = await getLasttradeDay(enddate);
    var dayrptsYes = await dayrptService.getDayrptByReportDay(yesdate);

    logger.info(yesdate.toDateString())

    if (dayrptsYes.length == 0) { return wresults; }

    dayrptsYes = dayrptsYes.filter(x => Number(x.RSI7) >= RSI_THRESHOLDS.DUAL_STRONG && x.RSI7 != null && Number(x.RSI14) >= RSI_THRESHOLDS.DUAL_STRONG && Number(x.TodayClosePrice) > PRICE_THRESHOLDS.MIN_YZM_CANDIDATE);

    if (dayrptsYes.length == 0) { return wresults; }

    var startdate = new Date(yesdate);
    startdate.setDate(yesdate.getDate() - 7);
    if (await tencentService.isHoliday(startdate)) {//如果起始日期正好处于假期，再往前+7天
        startdate.setDate(startdate.getDate() - 7);
    }

    var dayrpts = await dayrptService.getDayrptByReportDay2(startdate, yesdate);
    if (dayrpts.length == 0) { return wresults; }

    for (let index = 0; index < dayrptsYes.length; index++) {
        const element = dayrptsYes[index];
        if (element.StockCode=="sz399001") {continue;}

        var dayrptsTemp = dayrpts.filter(x => x.StockCode == element.StockCode);
        if (dayrptsTemp.length == 0) { continue; }

        dayrptsTemp.sort((a, b) => Number(b!.ReportDay) - Number(a!.ReportDay));

        if (validTremor(dayrptsTemp)) { continue; }

        try {
            var isVolUpPriceUp = false;
            var isDoubleStrong = false;
            var iStatus = 0;
            var isStar = false;
            var todayPrice = Number(dayrptsTemp[0].TradingPriceAvg);
            var todayVol = Number(dayrptsTemp[0].TradingVol);
            var todateRSI7 = Number(dayrptsTemp[0].RSI7);
            var todateRSI14 = Number(dayrptsTemp[0].RSI14);

            var yesPrice = Number(dayrptsTemp[1].TradingPriceAvg);
            var yesVol = Number(dayrptsTemp[1].TradingVol);

            if (todayPrice > yesPrice && todayVol > yesVol) {//判断量价齐升
                var tempVolRate = (todayVol - yesVol) / yesVol * 100
                var tempPriceRate = (todayPrice - yesPrice) / yesPrice * 100
                if (tempVolRate > 80 && tempPriceRate > 5) { isVolUpPriceUp = true; }
            }

            if (todateRSI7 > 50 && todateRSI14 > 50) { isDoubleStrong = true; }

            var iCountRise = 0;
            for (let index = 1; index < dayrptsTemp.length; index++) {
                const element = dayrptsTemp[index];

                var todayRSI7 = Number(dayrptsTemp[index - 1].RSI7);
                var todayRSI14 = Number(dayrptsTemp[index - 1].RSI14);
                var yesRSI7 = Number(dayrptsTemp[index].RSI7);
                var yesRSI14 = Number(dayrptsTemp[index].RSI14);
                if (index == 1) { iStatus = parseInt((todayRSI7 / 10).toFixed(2)) };
                if (todayRSI7 > yesRSI7 && todayRSI14 > yesRSI14) { iCountRise++; }
                else {
                    break;//如果不是连续上升 中断
                    // if (iCountRise>0) {break;}
                }


                if (index > 1) {
                    var temp = parseInt((todayRSI7 / 10).toFixed(2))
                    // logger.info([temp, element.StockCode].join(' '))
                    if (iStatus - 1 == temp) {
                        iStatus--;
                        isStar = true;
                    }
                    else { isStar = false; iStatus = 0; }
                }

                if (iCountRise == 3 && isStar) { break; }

                if (iCountRise > 3) { break; }
            }

            if (iCountRise >= 2) {
                var mResult = new wresult();
                mResult.stockcode = element.StockCode
                mResult.rsi7 = Number(element.RSI7);
                mResult.rsi14 = Number(element.RSI14);
                mResult.Type = rdType.YZMpatton;
                mResult.price = todayPrice;
                mResult.MA = Number(element.MA);
                mResult.bollDown = Number(element.bollDown);
                if (isStar) { mResult.eval = "*"; }
                mResult.eval += iCountRise.toString();
                if (isVolUpPriceUp) { mResult.eval += "|量价齐升"; }
                if (isDoubleStrong) { mResult.eval += "|双强"; }
                if (mResult.rsi7 >= RSI_THRESHOLDS.DUAL_STRONG && mResult.rsi7 < RSI_THRESHOLDS.STRONG && mResult.rsi14 >= RSI_THRESHOLDS.DUAL_STRONG && mResult.rsi14 < RSI_THRESHOLDS.STRONG) {
                    mResult.eval += '|双6';
                }
                wresults.push(mResult)
            }
        } catch (error) {
            logger.info(element.StockCode)
        }

    }

    return wresults;

}
