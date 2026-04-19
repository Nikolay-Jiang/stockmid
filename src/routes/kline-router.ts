import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';
import klineService from '@services/kline-service';
import stocknameService from '@services/stockname-service';
import { ParamMissingError } from '@shared/errors';


const router = Router();
const { OK } = StatusCodes;

// 支持的K线周期
const ALLOWED_PERIODS: ReadonlySet<string> = new Set([
    '1d', '1w', '1M', '5m', '15m', '60m',
]);

const MAX_RECENT_COUNT = 2000;
const DEFAULT_RECENT_COUNT = 100;


function assertPeriod(period: string): void {
    if (!period || !ALLOWED_PERIODS.has(period)) {
        throw new ParamMissingError();
    }
}


export const p = {
    getbyconditicon: '/allbycondition/:startday/:endday/:stockcode/:period',
    getbycode: '/allbycode/:stockcode/:period',
    getrecent: '/recent/:stockcode/:period/:count',
} as const;


/**
 * Get KLine by stockcode + period + date range.
 */
router.get(p.getbyconditicon, async (req: Request, res: Response) => {
    const { startday, endday, stockcode, period } = req.params;
    assertPeriod(period);

    const begindate: Date = new Date(startday);
    const enddate: Date = new Date(endday);

    //修车UTC存储问题
    if (begindate.getHours() == 0) {
        begindate.setHours(begindate.getHours() + 8);
    }
    if (enddate.getHours() == 0) {
        enddate.setHours(enddate.getHours() + 8);
    }

    const klines = await klineService.getKLineByCondition(
        begindate, enddate, stockcode, period,
    );
    const mName = await stocknameService.getOne(stockcode);
    let stockname;
    if (mName != null) {
        stockname = mName.StockName;
    }

    return res.status(OK).json({ stockname, klines });
});


/**
 * Get all KLine by stockcode + period.
 */
router.get(p.getbycode, async (req: Request, res: Response) => {
    const { stockcode, period } = req.params;
    assertPeriod(period);

    const klines = await klineService.getKLineByCode(stockcode, period);
    return res.status(OK).json({ klines });
});


/**
 * Get recent N KLine bars by stockcode + period.
 */
router.get(p.getrecent, async (req: Request, res: Response) => {
    const { stockcode, period, count } = req.params;
    assertPeriod(period);

    let n = Number(count);
    if (!Number.isFinite(n) || n <= 0) {
        n = DEFAULT_RECENT_COUNT;
    }
    if (n > MAX_RECENT_COUNT) {
        n = MAX_RECENT_COUNT;
    }

    const klines = await klineService.getKLineRecent(stockcode, period, n);
    return res.status(OK).json({ klines });
});


export default router;
