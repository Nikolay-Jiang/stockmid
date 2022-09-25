import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';

import predictService, { predictresult, statsGood } from '@services/predict-service';
import { ParamMissingError } from '@shared/errors';
import dayrptService from '@services/dayrpt-service';
import commonService from '@services/common-service';
import { t_Predict } from '@prisma/client';



// Constants
const router = Router();
const { CREATED, OK } = StatusCodes;

// Paths
export const p = {
    get: '/getallbyday/:startday/:endday',
    getbyday: '/getbyday/:startday/:evalnumber',
    getbycode: '/getbycode/:startday/:endday/:stockcode',
    getbycode2: '/getbycode2/:startday/:stockcode',//根据日期和代码 获取预测表记录
    backtest: '/backtest/:startday/:evalnumber',//回测某日的全部数据
    backteston: '/backteston/:startday',//回测某日数据并写入 predict 的backtest 列
    backtestbyMonth: '/backtestbymonth/:startday',//按月执行预测表的回测功能
    aYZM: '/ayzm/:startday/:endday/:evelrate', //分析YZM算法
} as const;



/**
 * Get all predict.
 */
router.get(p.get, async (req: Request, res: Response) => {
    const { startday, endday } = req.params;
    if (startday == undefined || startday == "") { throw new ParamMissingError(); }
    var startdate = new Date(startday);
    var enddate = new Date(endday);
    const predicts = await predictService.getPredictByPredictTime(startdate, enddate);
    return res.status(OK).json({ predicts });
});


/**
 * Get predict by code.
 */
router.get(p.getbycode, async (req: Request, res: Response) => {
    const { startday, endday, stockcode } = req.params;
    if (startday == undefined || startday == "") { throw new ParamMissingError(); }
    var startdate = new Date(startday);
    var enddate = new Date(endday);
    const predicts = await predictService.getPredictByCode(startdate, enddate, stockcode);
    return res.status(OK).json({ predicts });
});

/**
 * Get predict by code2.
 */
router.get(p.getbycode2, async (req: Request, res: Response) => {
    const { startday, stockcode } = req.params;
    if (startday == undefined || startday == "") { throw new ParamMissingError(); }
    var enddate = new Date(startday);
    var startdate = new Date(startday);

    startdate.setDate(enddate.getDate() - 60);
    const predicts = await predictService.getPredictByCode(startdate, enddate, stockcode);
    return res.status(OK).json({ predicts });
});


/**
 * Get all predict By Day.
 */
router.get(p.getbyday, async (req: Request, res: Response) => {
    const { startday, evalnumber } = req.params;
    if (startday == undefined || startday == "") { throw new ParamMissingError(); }
    var startdate = new Date(startday);
    var evalTmp = 0.4
    if (evalnumber != undefined || evalnumber != "") { evalTmp = Number(evalnumber); }


    const predicts = await predictService.getPredictByDay(startdate, evalTmp);
    // var testresults = predicts.filter(x => x.CatchRsi7 >= 60 && x.CatchRsi7 <= 70 && x.CatchRsi14 >= 60 && x.CatchRsi14 <= 70);
    // console.log(testresults.length)
    // return res.status(OK).json({ testresults, statsGood });
    return res.status(OK).json({ predicts, statsGood });
});

/**
 * BackTest predict.
 */
router.get(p.backtest, async (req: Request, res: Response) => {
    const { startday, evalnumber } = req.params;
    if (startday == undefined || startday == "") { throw new ParamMissingError(); }
    var startdate = new Date(startday);
    startdate.setHours(8, 0, 0, 0);
    var evalTmp = 0.4
    if (evalnumber != undefined || evalnumber != "") { evalTmp = Number(evalnumber); }
    var hs300rpt = await dayrptService.getone(startdate, "sh000300");
    console.log(hs300rpt, startdate.toUTCString());

    var predicts = await predictService.getPredictByDay(startdate, evalTmp);
    var Wpredicts = predicts.filter(x => x.Type == "W");
    var YZMpredicts = predicts.filter(x => x.Type == "YZM");
    var WText = "";
    var YZMText = "";
    var hs300 = "";



    if (hs300rpt != null) {
        var iTemp = (Number(hs300rpt.TodayClosePrice!) - Number(hs300rpt.TodayOpenPrice!)) / Number(hs300rpt.TodayOpenPrice);
        var iRate = (iTemp * 100).toFixed(2) + "%";
        hs300 = "\r\n 沪深300：" + iRate
    }
    if (Wpredicts.length > 0) {
        var iSumDayDiff = 0;
        var iDayDiffAvg = 0;
        var iMiniBenfit = 100;
        var iCountGood = 0;
        var iStatusGoodW = "0";
        Wpredicts.forEach(function (item) {
            if (item.isGood) {
                iSumDayDiff += item.MaxDayDiff;
                iCountGood++;
                if (item.evalprice < iMiniBenfit) { iMiniBenfit = item.evalprice; }
            }
        })

        if (iCountGood > 0) {
            iDayDiffAvg = parseInt((iSumDayDiff / iCountGood).toFixed(2))
            iStatusGoodW = (iCountGood / Wpredicts.length * 100).toFixed(2);
        }

        if (iCountGood == 0) { iMiniBenfit = 0; }

        WText = `共有W数据${Wpredicts.length}条,其中获益${iCountGood}条，获益比${iStatusGoodW}%;平均获益时间：${iDayDiffAvg}天，最低获益金额：${iMiniBenfit}元`;
        // console.log(iSumDayDiff, iCountGood, iDayDiffAvg)

    }


    if (YZMpredicts.length > 0) {
        var iSumDayDiff = 0;
        var iDayDiffAvg = 0;
        var iMiniBenfit = 100;
        var iCountGood = 0;
        var iStatusGoodYZM = "0";

        YZMpredicts.forEach(function (item) {
            if (item.isGood) {
                iSumDayDiff += item.MaxDayDiff;
                iCountGood++;
                if (item.evalprice < iMiniBenfit) { iMiniBenfit = item.evalprice; }
            }
        })

        if (iCountGood > 0) {
            iDayDiffAvg = parseInt((iSumDayDiff / iCountGood).toFixed(2))
            iStatusGoodYZM = (iCountGood / YZMpredicts.length * 100).toFixed(2);
        }

        if (iCountGood == 0) { iMiniBenfit = 0; }


        YZMText = `共有YZM数据${YZMpredicts.length}条,其中获益${iCountGood}条，获益比${iStatusGoodYZM}%;平均获益时间：${iDayDiffAvg}天，最低获益金额：${iMiniBenfit}元`;
        YZMText += hs300;
        console.log(iSumDayDiff, iCountGood, iDayDiffAvg)
    }

    return res.status(OK).json({ WText, YZMText });

});


/**
 * 生成单日的回测数据
 */
router.get(p.backteston, async (req: Request, res: Response) => {
    const { startday } = req.params;
    if (startday == undefined || startday == "") { throw new ParamMissingError(); }
    var startdate = new Date(startday);

    var predicts = await predictService.backtestol(startdate);

    return res.status(OK).end("accomplish");

});

/**
 * 生成单月的回测数据
 */
router.get(p.backtestbyMonth, async (req: Request, res: Response) => {
    const { startday } = req.params;
    if (startday == undefined || startday == "") { throw new ParamMissingError(); }
    var startdate = new Date(startday);

    var i = 1;
    var iMonth = startdate.getMonth();
    while (iMonth == startdate.getMonth()) {
        startdate.setDate(i)
        var predicts = await predictService.backtestol(startdate);
        i++
        console.log(startdate.toDateString(), iMonth);
    }

    return res.status(OK).end("accomplish");

});

/**
 * YZM 专门分析
 */
router.get(p.aYZM, async (req: Request, res: Response) => {
    const { startday, endday, evelrate } = req.params;
    if (startday == undefined || startday == "") { throw new ParamMissingError(); }
    var startdate = new Date(startday);
    var enddate = new Date(endday);
    var iCount = commonService.calc_day(enddate.getTime(), startdate.getTime(),);
    var rate = Number(evelrate);

    // console.log(iCount, startdate, enddate)
    if (iCount > 0) {
        for (let index = 0; index < iCount; index++) {
            if (startdate.getDay() == 6 || startdate.getDay() == 0) { startdate.setDate(startdate.getDate() + 1); continue; }
            console.log(startdate.toDateString());
            var tempday = new Date(startdate);
            const predicts = await predictService.getPredictByDay(tempday);
            var predictsfilter = predicts.filter(x => x.evalrate > rate && x.Type == "YZM").sort((a, b) => b.evalrate - a.evalrate);
            an1(predictsfilter)

            // console.log("end:",startdate.toDateString())
            console.log("-----------------")
            sim1(predicts.sort((a, b) => b.evalrate - a.evalrate));
            startdate.setDate(startdate.getDate() + 1);
        }
        return res.status(OK).end();
    }
    else {
        const predicts = await predictService.getPredictByDay(startdate);
        var predictsfilter = predicts.filter(x => x.evalrate > rate && x.Type == "YZM").sort((a, b) => b.evalrate - a.evalrate);
        an1(predictsfilter)
        // sim1(predicts);
        return res.status(OK).json({ predictsfilter });
    }






});

function sim1(predicts: predictresult[]) {
    for (let index = 0; index < predicts.length; index++) {
        const element = predicts[index];

        var evelstrs = element.eval.split("|");
        var strChong = evelstrs[evelstrs.length - 1];
        var rsiCompare = element.CatchRsi7 - element.CatchRsi14;

        if (strChong != "重4") { continue; }
        if (rsiCompare < 10) { continue; }
        if (element.CatchPrice < 15) { continue }
        //判断是否从高点回落，正确状态：连续1周从低位往上

//需要加入交易量分析
        console.log("sim1:", element.StockCode, element.evalrate);

        // var 
        // var str1, str2, str3, str4 = "";
        // if (evelstrs.length > 0) { str1 = evelstrs[0]; }
        // if (evelstrs.length > 1) { str2 = evelstrs[2]; }
        // if (evelstrs.length > 2) { str3 = evelstrs[3]; }
        // if (evelstrs.length > 3) { str4 = evelstrs[4]; }
    }
}

function an1(predicts: predictresult[]) {
    var istat0 = 0;
    var istat1 = 0;
    var istat2 = 0;
    var istat3 = 0;
    var istat4 = 0;
    for (let index = 0; index < predicts.length; index++) {
        const element = predicts[index];

        if (element.eval.indexOf("重") > 0) {
            var iChong = Number(element.eval.substring(element.eval.length - 1))
            if (iChong == 1) { istat1++; }
            if (iChong == 2) { istat2++; }
            if (iChong == 3) { istat3++; }
            if (iChong == 4) { istat4++; }
        }
        else { istat0++; }
        console.log("an1", element.StockCode, (element.CatchRsi7 - element.CatchRsi14).toFixed(2), element.eval, element.evalrate)
    }

    console.log("stats:", istat0, "重1：", istat1, "重2：", istat2, "重3：", istat3, "重4：", istat4)
}


// Export default
export default router;
