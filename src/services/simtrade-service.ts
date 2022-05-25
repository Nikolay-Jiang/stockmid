import { t_StockDayReport, Prisma } from '@prisma/client'
// import { Stock } from '@repos/sinastock-repo';


export var isMpatton: boolean = false;
export var txtOP="";


function isAdd(dayrpts: t_StockDayReport[], index: number): boolean {
    txtOP="";
    var eleCurr = dayrpts[index];
    var eleYesterday = dayrpts[index - 1];
    // var eleBeforeyes = dayrpts[index - 2];
    var todayRSI14 = Number(eleCurr.RSI14)
    var todayRSI7 = Number(eleCurr.RSI7)
    var yesRSI14 = Number(eleYesterday.RSI14)
    var yesRSI7 = Number(eleYesterday.RSI7)

    var isStrong7 = false;
    var isStrong14 = false;

    if (yesRSI7 > 50) { isStrong7 = true; }
    if (yesRSI14 > 50) { isStrong14 = true; }

    if (isMpatton && todayRSI7 < 40) {
        isMpatton = false;
    }
    if (isMpatton) { return false }


    //RSI 双升
    if (todayRSI14 > yesRSI14 && todayRSI7 > yesRSI7) { txtOP="双升"; return true; }

    return false
}


function isReduce(dayrpts: t_StockDayReport[], index: number): boolean {
    txtOP="";
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

    if (todayRSI7 >= 50) {
        isMpatton = isM(dayrpts, index);
        if (isMpatton) {//M 右侧第一次减仓
            txtOP="M 右侧第一次出现"
            return true;
        }
    }

    if (isMpatton && todayRSI7 < 40) {//小于 40 自动解除
        isMpatton = false
    }

    //忽略处于 M右侧的状态
    if (isMpatton) { txtOP="M 右侧"; return false; }



    if (todayRSI14 > yesRSI14 && todayRSI7 > yesRSI7 && isStrong7) {//RSI 双升 7强 短期高位
        if (isRecentHigh(dayrpts, index, 2)) { txtOP="双升 RSI7 强 3天内高位"; return true; }
    }

    //RSI 双降
    if (todayRSI14 < yesRSI14 && todayRSI7 < yesRSI7) {txtOP="双降";  return true; }

    //RSI14 单降
    if (todayRSI14 < yesRSI14 && todayRSI7 >= yesRSI7) {txtOP="RSI 14 单降"; return true; }

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



    var iMax = dayrpts.findIndex(x => Number(x.RSI7) == Number(dayrpsTemp[dayrpsTemp.length - 1].RSI7));
    var iMaxsec = dayrpts.findIndex(x => Number(x.RSI7) == Number(dayrpsTemp[dayrpsTemp.length - 2].RSI7));

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
* 短期高位判断
*/
function isRecentHigh(dayrps: t_StockDayReport[], index: number, dayCount: number): boolean {
    if ((index - dayCount) >= 0) {//计算三天
        var element = dayrps[index];
        var dayrpsTemp = dayrps.slice(index - dayCount, index);
        dayrpsTemp.sort((a, b) => Number(a!.TodayMaxPrice) - Number(b!.TodayMaxPrice));

        if (Number(dayrpsTemp[dayrpsTemp.length - 1].TodayMaxPrice) <= Number(element.TodayMaxPrice)) {
            console.log("recentHI!!!")
            return true;
        }

    }

    return false;
}


/*
* 短期低位判断
*/
function isRecentLow(dayrps: t_StockDayReport[], index: number, dayCount: number): boolean {
    if ((index - dayCount) >= 0) {//计算三天
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



// Export default
export default {
    isAdd,
    isReduce,
    isM,
    isRecentHigh,
    isRecentLow
} as const;


export enum stockOP {
    buy,
    add,
    hold,
    reduce,
    sell,
}