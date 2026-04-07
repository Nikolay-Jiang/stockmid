import { t_StockDayReport } from '@prisma/client'
import { RSI_THRESHOLDS } from '@shared/constants/trading-constants';
import logger from 'jet-logger';
import { validTremor, isUnderLow, isRecentHigh } from './data-prep';

export var isMpatton: boolean = false;
export var isWpatton: boolean = false;
export var iCountW: number = 0;
export var wStr: string = "";

export var txtOP = "";


export async function isAdd(dayrpts: t_StockDayReport[], index: number): Promise<boolean> {
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


export function isReduce(dayrpts: t_StockDayReport[], index: number): boolean {
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

export function isM(dayrpts: t_StockDayReport[], index: number): boolean {

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

/*
* 寻找RSI W图形
* dayrpts:需要分析的日报数据
* index:起始位置
* iRsiDecide: RSI7 决策值
* RsiAvg:Rsi RSI7平均值
* isIgnoreTremor 忽略振荡
*/
export async function isW(dayrpts: t_StockDayReport[], index: number, iRSIDecide: number, RSIavg: number = RSI_THRESHOLDS.DEFAULT_AVG, isIgnoreTremor: boolean = true): Promise<boolean> {
    wStr = "";
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
        if (validTremor(dayrptsCopy)) { logger.info("Tremor"); return false; }
    }


    // logger.info([RSIavg, yesRSI7, last3rsiavg].join(' '))
    if (RSIavg > RSI_THRESHOLDS.DEFAULT_AVG && yesRSI7 < RSI_THRESHOLDS.OVERSOLD) {
        if (last3rsiavg <= RSI_THRESHOLDS.DEFAULT_AVG) { return false; }
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

    // if (iMin != iCurr) { iMinsec = iCurr }

    // logger.info([eleCurr.StockCode, eleCurr.ReportDay.toDateString(), iMin, iMinsec, Number(dayrptsCopy[iMin].RSI7), Number(dayrptsCopy[iMinsec].RSI7)].join(' '))

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
        return false;
    }




    if (isUnderLow(iFirst, iSec, dayrptsCopy)) {
        // logger.info("step4");
        return false;
    }

    var iMaxRsi7 = 0;
    var iFirstRsi7 = Number(dayrptsCopy[iFirst].RSI7);
    var iSecRsi7 = Number(dayrptsCopy[iSec].RSI7);
    for (let index = iFirst; index < iSec; index++) {
        const CurrentRsi = Number(dayrptsCopy[index].RSI7);
        if (CurrentRsi > iMaxRsi7) {
            iMaxRsi7 = CurrentRsi;
        }
    }

    if (iMaxRsi7 < iFirstRsi7 || iMaxRsi7 < iSecRsi7) { return false }//如果MAXRSI7 会小于其中一个 低峰，则W不成立

    wStr = "|" + iFirstRsi7.toFixed() + "," + iMaxRsi7.toFixed() + "," + iSecRsi7.toFixed();
    // logger.info([eleCurr.StockCode, iFirstRsi7, iMaxRsi7, iSecRsi7].join(' '))
    // logger.info([iFirst, iSec, eleCurr.StockCode,dayrptsCopy[iFirst].RSI7,dayrptsCopy[iSec].RSI7].join(' '));

    return true;
}
