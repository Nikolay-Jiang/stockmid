import predictRepo from '@repos/predict-repo';
import { t_Predict } from '@prisma/client'
import simtradeService, { rdType } from '@services/simtrade-service';
import analService from '@services/analysis-service';
import dayrptService from '@services/dayrpt-service';
import sinaService from '@services/sinastock-service';
import { cursorTo } from 'readline';



export var statsGood = "";


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
    startdate.setHours(8, 0, 0, 0);
    var needtoday: boolean = false;
    var today = new Date();
    var enddate = new Date();
    enddate.setDate(startdate.getDate() + 1);
    enddate.setHours(8, 0, 0, 0);
    var predictlist: Array<predictresult> = [];
    var iCountGood = 0;
    statsGood = "";


    const predicts = await predictRepo.getAllbyPredictTime(startdate, enddate);
    // console.log(enddate.toUTCString(), predicts.length);

    if (predicts.length == 0) { return predictlist; }

    //计算结果
    var daydiff = analService.calc_day(today.getTime(), startdate.getTime());

    startdate.setDate(startdate.getDate() + 1)
    enddate.setDate(startdate.getDate() + 9);
    // if (daydiff < 7 && today.getHours() >= 9 && today.getHours() <= 15) { needtoday = true; enddate = new Date(); }
    if (daydiff < 7) { needtoday = true; enddate = new Date(); }

    var dayrpts = await dayrptService.getDayrptByReportDay2(startdate, enddate)

    if (dayrpts.length == 0) { return predictlist; }

    var stockcodes = "";
    //获得STOCKCODES
    for (let index = 0; index < predicts.length; index++) {
        const element = predicts[index];
        stockcodes += (element.StockCode + ",")
    }

    var mystocks = await sinaService.getstockList(stockcodes);

    // if (needtoday) {
    //     //mystocks add dayrpts

    //     //  analService.GetTodayDayRpt()
    // }


    for (let index = 0; index < predicts.length; index++) {
        const element = predicts[index];

        var dayrptsTemp = dayrpts.filter(x => x.StockCode == element.StockCode);

        var mPredict: predictresult = new predictresult();
        var CurrentInfo = mystocks.filter(x => x.stockcode == element.StockCode);
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

        if (CurrentInfo.length > 0) { mPredict.CurrentPrice = Number(CurrentInfo[0].CurrentPrice); }

        if (needtoday) {
            var dayrptsCalc = await dayrptService.getdayRptCountByDayBefore(today, mPredict.StockCode, 15);
            dayrptsCalc.sort((a, b) => a!.ReportDay > b.ReportDay ? 1 : -1);
            var rsiCalc = await analService.rsiCalc(dayrptsCalc);
            mPredict.CurrentRsi7expect = rsiCalc.rsi7expect;
            mPredict.CurrentRsi14expect = rsiCalc.rsi14expect;
        }


        dayrptsTemp.sort((a, b) => Number(a!.TodayMaxPrice) - Number(b.TodayMaxPrice));
        var maxprice = Number(dayrptsTemp[dayrptsTemp.length - 1].TodayMaxPrice);
        mPredict.MaxDayPrice = maxprice
        mPredict.MaxDay = dayrptsTemp[dayrptsTemp.length - 1].ReportDay;
        mPredict.MaxDayBB = Number(dayrptsTemp[dayrptsTemp.length - 1].BB);
        mPredict.MaxDayRsi7 = Number(dayrptsTemp[dayrptsTemp.length - 1].RSI7);
        mPredict.MaxDayRsi14 = Number(dayrptsTemp[dayrptsTemp.length - 1].RSI14);

        if (mPredict.CurrentPrice > maxprice) {
            mPredict.MaxDayPrice = mPredict.CurrentPrice;
            mPredict.MaxDayRsi7 = -1;
            mPredict.MaxDayRsi14 = -1;
            mPredict.MaxDayBB = -1;
        }


        if (mPredict.MaxDayPrice > mPredict.CatchPrice && (mPredict.MaxDayPrice - mPredict.CatchPrice) > evalnumber) {
            mPredict.eval = "Good";
            iCountGood++

        }

        mPredict.evalprice = Number((mPredict.MaxDayPrice - mPredict.CatchPrice).toFixed(2));
        mPredict.evalrate = Number((mPredict.evalprice / mPredict.CatchPrice * 100).toFixed(2))

        predictlist.push(mPredict)
    }

    statsGood = (iCountGood / predicts.length * 100).toFixed(2) + "%";

    return predictlist
}



// Export default
export default {
    getPredictByPredictTime, getPredictByDay,
    addOne,

} as const;


export class predictresult {
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
    eval: string = "";// 评估的文字价格 GOOD= 当前价-预测价>0.4
    evalprice: number = 0; //MaxDayPrice-CatchPrice
    evalrate: number = 0; // (evelprice - catchprice)/catchprice *100 to fix(2)

}
