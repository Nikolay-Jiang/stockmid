import predictRepo from '@repos/predict-repo';
import { Prisma, t_Predict } from '@prisma/client'
import simtradeService, { rdType } from '@services/simtrade-service';
import analService from '@services/analysis-service';
import dayrptService from '@services/dayrpt-service';
import sinaService from '@services/sinastock-service';
import commonService from '@services/common-service';


export var statsGood = "";

const cacheTTL: number = 1800000

/**
 * Add one predict.
 * 
 * @param predict 
 * @returns 
 */
function addOne(predict: t_Predict): Promise<void> {
    return predictRepo.add(predict);
}



async function getPredictByPredictTime(startdate: Date, enddate: Date): Promise<t_Predict[]> {
    const predicts = await predictRepo.getAllbyPredictTime(startdate, enddate);
    return predicts
}


async function getPredictByDay(startdate: Date, evalnumber: number = 0.4): Promise<predictresult[]> {
    var cache = require('memory-cache');
    var cacheKey: string = "predict" + dayrptService.GetDateStr(startdate);
    startdate.setHours(8, 0, 0, 0);
    var needtoday: boolean = false;
    var today = new Date();
    var enddate = new Date(startdate);
    enddate.setDate(startdate.getDate() + 1);
    enddate.setHours(8, 0, 0, 0);
    var predictlist: Array<predictresult> = [];
    var iCountGood = 0;
    var iCountGoodFowW = 0;
    statsGood = "";

    var daydiff = commonService.calc_day(today.getTime(), startdate.getTime());

    if (daydiff > 0) {//读取缓存
        var cacheresult = cache.get(cacheKey);
        if (cacheresult != null) { return cacheresult; }
    }


    const predicts = await predictRepo.getAllbyPredictTime(startdate, enddate);

    if (predicts.length == 0) { return predictlist; }

    //计算结果  
    startdate.setDate(startdate.getDate() + 1)
    enddate.setDate(startdate.getDate() + 9);
    if (daydiff < 7 && today.getHours() >= 9) { needtoday = true; enddate = new Date(); enddate.setHours(8, 0, 0, 0); }
    //if (daydiff < 7) { needtoday = true; enddate = new Date(); }

    var dayrpts = await dayrptService.getDayrptByReportDay2(startdate, enddate)

    // if (dayrpts.length == 0) { return predictlist; }

    var stockcodes = "";
    //获得STOCKCODES
    for (let index = 0; index < predicts.length; index++) {
        const element = predicts[index];
        stockcodes += (element.StockCode + ",")
    }

    var mystocks = await sinaService.getstockList(stockcodes);

    for (let index = 0; index < predicts.length; index++) {
        const element = predicts[index];

        var dayrptsTemp = dayrpts.filter(x => x.StockCode == element.StockCode);

        var mPredict: predictresult = new predictresult();
        var CurrentInfo = mystocks.filter(x => x.stockcode == element.StockCode);
        mPredict.PredictKey = element.PredictKey;
        mPredict.StockCode = element.StockCode!
        mPredict.PredictTime = element.PredictTime!;
        mPredict.CatchPrice = Number(element.CurrentPrice);
        mPredict.CatchRsi7 = Number(element.RSI7);
        mPredict.CatchRsi14 = Number(element.RSI14);



        switch (element.Type) {
            case "W":
                mPredict.Type = rdType.wpatton
                break;
            case "YZM":
                mPredict.Type = rdType.YZMpatton
                break;
            default:
                break;
        }

        if (CurrentInfo.length > 0) {
            mPredict.CurrentPrice = Number(CurrentInfo[0].CurrentPrice);
            if (needtoday && today.getHours() >= 16) {
                var dayrptsCurr = dayrptsTemp.filter(x => x.ReportDay == enddate)
                if (dayrptsCurr.length > 0) {
                    mPredict.CurrentBB = Number(dayrptsCurr[0].BB)
                }
            }

        }

        if (needtoday) {
            var yesday = new Date(today);
            yesday.setDate(today.getDate() - 1);
            var dayrptsCalc = await dayrptService.getdayRptCountByDayBefore(yesday, mPredict.StockCode, 15);
            dayrptsCalc.sort((a, b) => a!.ReportDay > b.ReportDay ? 1 : -1);
            var rsiCalc = await analService.rsiCalc(dayrptsCalc);
            mPredict.CurrentRsi7expect = rsiCalc.rsi7expect;
            mPredict.CurrentRsi14expect = rsiCalc.rsi14expect;
            if (mPredict.CurrentPrice > rsiCalc.rsi7expect && mPredict.CurrentPrice > rsiCalc.rsi14expect) {
                mPredict.eval = "|C双升|"
            }
            mPredict.MaxDayPrice = mPredict.CurrentPrice;
        }

        if (dayrptsTemp.length > 0) {
            dayrptsTemp.sort((a, b) => Number(a!.TodayMaxPrice) - Number(b.TodayMaxPrice));
            var maxprice = Number(dayrptsTemp[dayrptsTemp.length - 1].TodayMaxPrice);
            mPredict.MaxDayPrice = maxprice
            mPredict.MaxDay = dayrptsTemp[dayrptsTemp.length - 1].ReportDay;
            mPredict.MaxDayBB = Number(dayrptsTemp[dayrptsTemp.length - 1].BB);
            mPredict.MaxDayRsi7 = Number(dayrptsTemp[dayrptsTemp.length - 1].RSI7);
            mPredict.MaxDayRsi14 = Number(dayrptsTemp[dayrptsTemp.length - 1].RSI14);
            mPredict.MaxDayDiff = commonService.calc_day(mPredict.MaxDay.getTime(), startdate.getTime()) + 1;


            if (mPredict.CurrentPrice > maxprice && needtoday) {
                mPredict.MaxDayPrice = mPredict.CurrentPrice;
                mPredict.MaxDayRsi7 = -1;
                mPredict.MaxDayRsi14 = -1;
                mPredict.MaxDayBB = -1;
            }
        }

        mPredict.eval += element.Memo!

        if (mPredict.MaxDayPrice > mPredict.CatchPrice && (mPredict.MaxDayPrice - mPredict.CatchPrice) > evalnumber) {

            mPredict.eval += "|Good";
            mPredict.isGood = true;
            iCountGood++

        }
        else if (daydiff > 7) { mPredict.eval += "|Bad"; }//超过7天的给出BAD 判断

        var repeatDayStart = new Date(startdate);
        repeatDayStart.setDate(startdate.getDate() - 60);
        var iRepeatCount: number = await isRepeat(repeatDayStart, startdate, mPredict.StockCode)//判断曾经是否出现过
        // console.log(iRepeatCount,mPredict.StockCode)
        iRepeatCount--;
        if (iRepeatCount > 0) {
            mPredict.eval += `|重${iRepeatCount}`;
        }

        mPredict.evalprice = Number((mPredict.MaxDayPrice - mPredict.CatchPrice).toFixed(2));
        mPredict.evalrate = Number((mPredict.evalprice / mPredict.CatchPrice * 100).toFixed(2))

        predictlist.push(mPredict)
    }

    statsGood = (iCountGood / predicts.length * 100).toFixed(2) + "%";
    predictlist.sort(((a, b) => b.CatchPrice - a.CatchPrice));

    if (daydiff > 0 && commonService.checkCache()) {cache.put(cacheKey, predictlist, cacheTTL);}//写入缓存

    return predictlist
}

async function getPredictByCode(startdate: Date, enddate: Date, stockcode: string): Promise<t_Predict[]> {
    const predicts = await predictRepo.getAllbyCode(startdate, enddate, stockcode);
    return predicts
}

/**
 * 检测stockcode是否在指定时间段内出现过，返回0表示没有。
 */
async function isRepeat(startdate: Date, enddate: Date, stockcode: string): Promise<number> {
    const predicts = await predictRepo.getAllbyCode(startdate, enddate, stockcode);
    return predicts.length
}


/**
 * 生成单日的回测数据
 * @param startdate 
 */
async function backtestol(startdate: Date) {

    var predicts = await getPredictByDay(startdate);
    if (predicts.length == 0) { return; }
    console.log(startdate.toUTCString(), predicts.length)

    for (let index = 0; index < predicts.length; index++) {
        const element = predicts[index];

        var sBackTest = `${element.MaxDayPrice}|${element.MaxDayDiff}|${element.evalprice}`;
        var mPredict: t_Predict = {
            PredictKey: element.PredictKey,
            StockCode: '',
            PredictTime: new Date(),
            Type: element.Type,
            CurrentPrice: null,
            RSI7: null,
            RSI14: null,
            BackTest: sBackTest,
            Memo: "",
        }

        predictRepo.update(mPredict);
    }

}


// Export default
export default {
    getPredictByPredictTime, getPredictByDay,
    addOne, backtestol, getPredictByCode,isRepeat,

} as const;


export class predictresult {
    PredictKey: string = "";
    StockCode: string = "";
    Type: rdType = rdType.unknow; //预测上升类型 目前有W YZM
    PredictTime!: Date; //预测执行的时间 
    CatchRsi7: number = 0; //预测时的RSI7
    CatchRsi14: number = 0; //预测时的RSI14
    CatchPrice: number = -1;//预测时的价格
    CatchBB: number = -1;//预测时的BB
    CurrentPrice: number = -1;//当前价格
    CurrentRsi7expect: number = -1;//当前RSI7 预期价格
    CurrentRsi14expect: number = -1;// 当前RSI14 预期价格
    CurrentBB: number = -1;
    MaxDayPrice: number = 0; //评估期内 最高价格
    MaxDay!: Date; //评估期内 最高价格所属日期
    MaxDayRsi7: number = 0; //评估期内 最高日 RSI7
    MaxDayRsi14: number = 0; //评估期内 最高日 RSI14
    MaxDayBB: number = 0; //评估期内 最高日 BB
    MaxDayDiff: number = 0;
    eval: string = "";// 评估的文字价格 GOOD= 当前价-预测价>0.4
    evalprice: number = 0; //MaxDayPrice-CatchPrice
    evalrate: number = 0; // (evelprice - catchprice)/catchprice *100 to fix(2)
    isGood: boolean = false;

}
