import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';

import predictService, { predictresult, statsGood } from '@services/predict-service';
import { ParamMissingError } from '@shared/errors';
import dayrptService from '@services/dayrpt-service';
import commonService from '@services/common-service';
import { 
    validateDateParam, 
    parseNumberParam, 
    parseDate, 
    setTradingTime,
    getPastDate
} from '@shared/utils/route-utils';

import { 
    PREDICT_CONSTANTS, 
    MAGIC_NUMBERS 
} from '@shared/constants/predict-constants';
import simtradeService, { rdType } from '@services/simtrade-service';



// Constants
const router = Router();
const { OK } = StatusCodes;

// Paths
export const p = {
    get: '/getallbyday/:startday/:endday',
    getbyday: '/getbyday/:startday/:evalnumber',
    getbyday2: '/getbyday2/:startday/:evalnumber/:type',
    getbycode: '/getbycode/:startday/:endday/:stockcode',
    getbycode2: '/getbycode2/:startday/:stockcode',//根据日期和代码 获取预测表记录
    backtest: '/backtest/:startday/:evalnumber',//回测某日的全部数据 预测页面下方的数据
    backteston: '/backteston/:startday',//回测某日数据并写入 predict 的backtest 列
    backtestbyMonth: '/backtestbymonth/:startday',//按月执行预测表的回测功能
    aYZM: '/ayzm/:startday/:endday/:evelrate', //分析YZM算法,结果输出到CONSOLE
    qmt: '/qmt/:startday/',
    backtestQMT: '/btqmt/:startday/:endday' //指定时间内QMT方案回测,结果输出到CONSOLE

} as const;



/**
 * Get all predict.
 */
router.get(p.get, async (req: Request, res: Response) => {
    try {
        const { startday, endday } = req.params;
        
        validateDateParam(startday);
        validateDateParam(endday);
        
        const startDate = parseDate(startday);
        const endDate = parseDate(endday);
        
        const predicts = await predictService.getPredictByPredictTime(startDate, endDate);
        return res.status(OK).json({ predicts });
    } catch (error) {
        console.error(`Error in ${p.get}:`, error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            error: 'Failed to fetch predicts' 
        });
    }
});


/**
 * Get predict by code.
 */
router.get(p.getbycode, async (req: Request, res: Response) => {
    try {
        const { startday, endday, stockcode } = req.params;
        
        validateDateParam(startday);
        validateDateParam(endday);
        
        const startDate = parseDate(startday);
        const endDate = parseDate(endday);
        
        const predicts = await predictService.getPredictByCode(startDate, endDate, stockcode);
        return res.status(OK).json({ predicts });
    } catch (error) {
        console.error(`Error in ${p.getbycode}:`, error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            error: 'Failed to fetch predicts by code' 
        });
    }
});

/**
 * Get predict by code2.
 */
router.get(p.getbycode2, async (req: Request, res: Response) => {
    try {
        const { startday, stockcode } = req.params;
        
        validateDateParam(startday);
        
        const endDate = parseDate(startday);
        const startDate = getPastDate(endDate, PREDICT_CONSTANTS.PAST_DAYS_FOR_CODE2);
        
        const predicts = await predictService.getPredictByCode(startDate, endDate, stockcode);
        return res.status(OK).json({ predicts });
    } catch (error) {
        console.error(`Error in ${p.getbycode2}:`, error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            error: 'Failed to fetch predicts by code2' 
        });
    }
});


/**
 * Get all predict By Day.
 */
router.get(p.getbyday, async (req: Request, res: Response) => {
    try {
        const { startday, evalnumber } = req.params;
        
        validateDateParam(startday);
        
        const startDate = parseDate(startday);
        const evalNumber = parseNumberParam(evalnumber, PREDICT_CONSTANTS.DEFAULT_EVAL_NUMBER);
        
        const predicts = await predictService.getPredictByDay(startDate, evalNumber);
        return res.status(OK).json({ predicts, statsGood });
    } catch (error) {
        console.error(`Error in ${p.getbyday}:`, error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            error: 'Failed to fetch predicts by day' 
        });
    }
});

/**
 * Get all predict By Day with Type.
 */
router.get(p.getbyday2, async (req: Request, res: Response) => {
    try {
        const { startday, evalnumber,type } = req.params;
        
        validateDateParam(startday);
        
        const startDate = parseDate(startday);
        const evalNumber = parseNumberParam(evalnumber, PREDICT_CONSTANTS.DEFAULT_EVAL_NUMBER);
        
        const predictsAll = await predictService.getPredictByDay(startDate, evalNumber);
        const YZMpredicts=predictsAll.filter(n=>n.Type=="YZM");
        //const Wpredicts=predictsAll.filter(n=>n.Type=="W");

        if (type.toUpperCase()=="YZM-SIM1") {    
            var YZMsim1=sim1(YZMpredicts);
            console.log("sim1:",YZMsim1,YZMpredicts.length);
            if (YZMsim1=="") {
                return res.status(OK).json('');
                //predicts.length=0;
            }
            let predicts=YZMpredicts.filter(n=>YZMsim1.includes(n.StockCode));//挑出符合sim1的股票
            predicts.forEach(n => {
                n.Type=rdType.YZMsmi1;
            });
            return res.status(OK).json({ predicts, statsGood });    
        }else{
            let predicts=predictsAll.filter(n=>n.Type==type.toUpperCase())
            return res.status(OK).json({ predicts, statsGood });
        }
        
        //return res.status(OK).json({ predicts, statsGood });
    } catch (error) {
        console.error(`Error in ${p.getbyday}:`, error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            error: 'Failed to fetch predicts by day' 
        });
    }
});


/**
 * BackTest predict.
 */
router.get(p.backtest, async (req: Request, res: Response) => {
    const { startday, evalnumber } = req.params;
    if (startday === undefined || startday === "") { throw new ParamMissingError(); }
    const startdate = setTradingTime(parseDate(startday));
    let evalTmp: number = PREDICT_CONSTANTS.DEFAULT_EVAL_NUMBER;
    if (evalnumber !== undefined && evalnumber !== "") { 
        const parsed = Number(evalnumber);
        evalTmp = isNaN(parsed) ? PREDICT_CONSTANTS.DEFAULT_EVAL_NUMBER : parsed;
    }
    const hs300rpt = await dayrptService.getone(startdate, "sh000300");
    //console.log(hs300rpt, startdate.toUTCString());

    const predicts = await predictService.getPredictByDay(startdate, evalTmp);
    const Wpredicts = predicts.filter(x => x.Type === "W");
    const YZMpredicts = predicts.filter(x => x.Type === "YZM");
    let WText = "";
    let YZMText = "";
    let hs300 = "";


    //计算当日沪深300 涨幅情况
    if (hs300rpt !== null) {
        const closePrice = Number(hs300rpt.TodayClosePrice);
        const openPrice = Number(hs300rpt.TodayOpenPrice);
        if (!isNaN(closePrice) && !isNaN(openPrice) && openPrice !== 0) {
            const iTemp = (closePrice - openPrice) / openPrice;
            const iRate = (iTemp * 100).toFixed(2) + "%";
            hs300 = "  沪深300：" + iRate + ";";
        }
    }
    if (Wpredicts.length > 0) {
        let iSumDayDiff = 0;
        let iDayDiffAvg = 0;
        let iMiniBenfit: number = MAGIC_NUMBERS.MINI_BENEFIT_INIT;
        let iCountGood = 0;
        let iStatusGoodW = "0";
        
        Wpredicts.forEach((item) => {
            if (item.isGood) {
                iSumDayDiff += item.MaxDayDiff;
                iCountGood++;
                if (item.evalprice < iMiniBenfit) { iMiniBenfit = item.evalprice; }
            }
        });

        if (iCountGood > 0) {
            iDayDiffAvg = parseInt((iSumDayDiff / iCountGood).toFixed(2));
            iStatusGoodW = ((iCountGood / Wpredicts.length) * 100).toFixed(2);
        }

        if (iCountGood === 0) { iMiniBenfit = 0; }

        WText = `共有W数据${Wpredicts.length}条,其中获益${iCountGood}条，获益比${iStatusGoodW}%;` +
                `平均获益时间：${iDayDiffAvg}天，最低获益金额：${iMiniBenfit}元`;
        // console.log(iSumDayDiff, iCountGood, iDayDiffAvg)
    }


    if (YZMpredicts.length > 0) {
        let iSumDayDiff = 0;
        let iDayDiffAvg = 0;
        let iMiniBenfit: number = MAGIC_NUMBERS.MINI_BENEFIT_INIT;
        let iCountGood = 0;
        let iStatusGoodYZM = "0";

        YZMpredicts.forEach((item) => {
            if (item.isGood) {
                iSumDayDiff += item.MaxDayDiff;
                iCountGood++;
                if (item.evalprice < iMiniBenfit) { iMiniBenfit = item.evalprice; }
            }
        });

        if (iCountGood > 0) {
            iDayDiffAvg = parseInt((iSumDayDiff / iCountGood).toFixed(2));
            iStatusGoodYZM = ((iCountGood / YZMpredicts.length) * 100).toFixed(2);
        }

        if (iCountGood === 0) { iMiniBenfit = 0; }

        YZMText = `共有YZM数据${YZMpredicts.length}条,其中获益${iCountGood}条，获益比${iStatusGoodYZM}%;` +
                  `平均获益时间：${iDayDiffAvg}天，最低获益金额：${iMiniBenfit}元`;
        YZMText += hs300;
        YZMText += '  yzm-sim1:';
        YZMText += sim1(YZMpredicts);
        console.log(iSumDayDiff, iCountGood, iDayDiffAvg);
    }

    return res.status(OK).json({ WText, YZMText });

});

/**
 * api2qmt
 */
router.get(p.qmt, async (req: Request, res: Response) => {
    try {
        const { startday, evalnumber } = req.params;
        
        validateDateParam(startday);
        
        const startDate = setTradingTime(parseDate(startday));
        const evalNumber = parseNumberParam(evalnumber, PREDICT_CONSTANTS.DEFAULT_EVAL_NUMBER);
        
        const predicts = await predictService.getPredictByDay(startDate, evalNumber);
        const Wpredicts = predicts.filter(x => x.Type === "W");
        const YZMpredicts = predicts.filter(x => x.Type === "YZM");
        
        const Wcount = Wpredicts.length;
        const YZMcount = YZMpredicts.length;
        const YZMsim1 = sim1(YZMpredicts);
        const YSim1predicts = YZMpredicts.filter(x => YZMsim1.includes(x.StockCode));
        
        return res.status(OK).json({ Wcount, Wpredicts, YZMcount, YZMsim1, YSim1predicts });
    } catch (error) {
        console.error(`Error in ${p.qmt}:`, error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            error: 'Failed to process QMT request' 
        });
    }
});



/**
 * 生成单日的回测数据
 */
router.get(p.backteston, async (req: Request, res: Response) => {
    try {
        const { startday } = req.params;
        
        validateDateParam(startday);
        
        const startDate = parseDate(startday);
        
        await predictService.backtestol(startDate);
        
        return res.status(OK).end("accomplish");
    } catch (error) {
        console.error(`Error in ${p.backteston}:`, error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            error: 'Failed to generate daily backtest data' 
        });
    }
});

/**
 * 生成单月的回测数据
 */
router.get(p.backtestbyMonth, async (req: Request, res: Response) => {
    try {
        const { startday } = req.params;
        
        validateDateParam(startday);
        
        const startDate = parseDate(startday);
        const targetMonth = startDate.getMonth();
        let currentDate = new Date(startDate);
        let day = 1;
        
        while (currentDate.getMonth() === targetMonth) {
            currentDate.setDate(day);
            await predictService.backtestol(new Date(currentDate));
            day++;
            console.log(currentDate.toDateString(), targetMonth);
        }

        return res.status(OK).end("accomplish");
    } catch (error) {
        console.error(`Error in ${p.backtestbyMonth}:`, error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            error: 'Failed to generate monthly backtest data' 
        });
    }
});

/**
 * YZM 专门分析 console 输出结果
 */
router.get(p.aYZM, async (req: Request, res: Response) => {
    try {
        const { startday, endday, evelrate } = req.params;
        
        validateDateParam(startday);
        validateDateParam(endday);
        
        const startdate = parseDate(startday);
        const enddate = parseDate(endday);
        const iCount = commonService.calc_day(enddate.getTime(), startdate.getTime());
        const rate = parseNumberParam(evelrate, PREDICT_CONSTANTS.DEFAULT_EVAL_RATE);

        // console.log(iCount, startdate, enddate)
        if (iCount > 0) {
            for (let index = 0; index < iCount; index++) {
                if (startdate.getDay() == 6 || startdate.getDay() == 0) { startdate.setDate(startdate.getDate() + 1); continue; }
                console.log("日期：" + startdate.toDateString());
                const tempday = new Date(startdate);
                const predicts = await predictService.getPredictByDay(tempday);

                console.log("当日YZM总数:" + predicts.length);

                const predictsfilter = predicts.filter(x => x.evalrate > rate && x.Type == "YZM").sort((a, b) => b.evalrate - a.evalrate);
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
            const predictsfilter = predicts.filter(x => x.evalrate > rate && x.Type == "YZM").sort((a, b) => b.evalrate - a.evalrate);
            an1(predictsfilter)
            // sim1(predicts);
            return res.status(OK).json({ predictsfilter });
        }
    } catch (error) {
        console.error(`Error in ${p.aYZM}:`, error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            error: 'Failed to analyze YZM' 
        });
    }
});

/**
 * qmt 回测 console 输出结果
 */
router.get(p.backtestQMT, async (req: Request, res: Response) => {
    const { startday, endday } = req.params;
    if (startday == undefined || startday == "") { throw new ParamMissingError(); }
    const startdate = parseDate(startday);
    const enddate = parseDate(endday);
    const iCount = commonService.calc_day(enddate.getTime(), startdate.getTime());

    let iBuyCount = 0; // 记录买入次数

    console.log(iCount, startdate, enddate)
    if (iCount > 0) {
        for (let index = 0; index < iCount; index++) {
            if (startdate.getDay() == 6 || startdate.getDay() == 0) { startdate.setDate(startdate.getDate() + 1); continue; }
            console.log("日期：" + startdate.toDateString());
            const tempday = new Date(startdate);
            const predicts = await predictService.getPredictByDay(tempday);
            const Wpredicts = predicts.filter(x => x.Type === "W");
            const YZMpredicts = predicts.filter(x => x.Type === "YZM");
            const YZMsim1 = sim1(YZMpredicts);
            const YSim1predicts = YZMpredicts.filter(x => YZMsim1.includes(x.StockCode));

            console.log("YZM总数:" + YZMpredicts.length + ";W总数：" + Wpredicts.length + ";YZMsim1：" + YSim1predicts.length);

            let isBuy = false;





            const { W_THRESHOLDS, YZM_THRESHOLDS } = MAGIC_NUMBERS;
            
            if (Wpredicts.length > W_THRESHOLDS.LOW && YZMpredicts.length > YZM_THRESHOLDS.MEDIUM) {
                console.log("buy");
                isBuy = true;
            }

            if (Wpredicts.length > W_THRESHOLDS.MEDIUM) {
                isBuy = true;
                console.log("buy+");
            }

            if (YZMpredicts.length > YZM_THRESHOLDS.MEDIUM) {
                isBuy = true;
                console.log("buy+");
            }

            if (Wpredicts.length > W_THRESHOLDS.MEDIUM && YZMpredicts.length > YZM_THRESHOLDS.HIGH) {
                isBuy = true;
                console.log("buy++");
            }

            if (Wpredicts.length <= W_THRESHOLDS.LOW) {
                isBuy = false;
                console.log("sell");
            }

            if (Wpredicts.length <= W_THRESHOLDS.LOW || YZMpredicts.length < YZM_THRESHOLDS.LOW) {
                isBuy = false;
                console.log("sell+");
            }

            if (!isBuy) {
                if (YSim1predicts.length > 0 && Wpredicts.length > W_THRESHOLDS.LOW) {
                    isBuy = true;
                }
            }

            //统计
            if (isBuy) {
                const iSim1Loss = YSim1predicts.filter(x => x.evalprice <= MAGIC_NUMBERS.BACKTEST.MIN_EVAL_PRICE);
                let iLoss = 0;
                iBuyCount++;
                if (iSim1Loss.length > 0) {
                    iLoss = (iSim1Loss.length / YSim1predicts.length) * MAGIC_NUMBERS.STATISTICS.PERCENTAGE_MULTIPLIER;
                }
                console.log("统计：" + iLoss.toFixed(MAGIC_NUMBERS.STATISTICS.DECIMAL_PLACES));
            }

            console.log("-----------------")
            // sim1(predicts.sort((a, b) => b.evalrate - a.evalrate));
            startdate.setDate(startdate.getDate() + 1);
        }

        //表格输出
        console.log("回测天数："+iCount+"买入："+iBuyCount);
        return res.status(OK).end();
    }
    else {
        // const predicts = await predictService.getPredictByDay(startdate);
        // var predictsfilter = predicts.filter(x => x.evalrate > rate && x.Type == "YZM").sort((a, b) => b.evalrate - a.evalrate);
        // an1(predictsfilter)
        // sim1(predicts);
        return res.status(OK).end("accomplish");
    }

});


//YZM-SIM1 筛选
function sim1(predicts: predictresult[]): string {
    const { SIM1_THRESHOLDS } = PREDICT_CONSTANTS;
    let s1 = "";
    
    for (const element of predicts) {
        const evelstrs = element.eval.split("|");
        const strChong = evelstrs[evelstrs.length - 1];
        const rsiCompare = element.CatchRsi7 - element.CatchRsi14;
        
        if (strChong !== "重4") continue;
        if (rsiCompare < SIM1_THRESHOLDS.MIN_RSI_DIFF) continue;
        if (element.CatchRsi7 > SIM1_THRESHOLDS.MAX_RSI7) continue;
        if (element.CatchPrice < SIM1_THRESHOLDS.MIN_PRICE) continue;
        
        console.log("sim1:", element.StockCode, element.evalprice, element.evalrate);
        s1 += element.StockCode + ";";
    }
    
    return s1;
}

//YZM专门分析1
function an1(predicts: predictresult[]) {
    let istat0 = 0;
    let istat1 = 0;
    let istat2 = 0;
    let istat3 = 0;
    let istat4 = 0;

    console.log("方法名称 代码 RSI7-RSI14 评估 上升金额 上升率%");
    
    for (const element of predicts) {
        if (element.eval.indexOf("重") > 0) {
            const iChong = Number(element.eval.substring(element.eval.length - 1));
            if (iChong === 1) { istat1++; }
            if (iChong === 2) { istat2++; }
            if (iChong === 3) { istat3++; }
            if (iChong === 4) { istat4++; }
        }
        else { istat0++; }

        console.log("方法1", element.StockCode, (element.CatchRsi7 - element.CatchRsi14).toFixed(2), element.eval, element.evalprice, element.evalrate);
    }
    
    const isumstat = istat0 + istat1 + istat2 + istat3 + istat4;
    console.log("统计分析:", "总计", isumstat, "首次：", istat0, "重1：", istat1, "重2：", istat2, "重3：", istat3, "重4：", istat4);
}


// Export default
export default router;
