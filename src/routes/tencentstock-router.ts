import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';
import tencentstockService from '@services/tencentstock-service';
import dayrptService from '@services/dayrpt-service';



// Constants
const router = Router();
const { CREATED, OK } = StatusCodes;

// Paths
export const p = {
    getstocks: '/allbycodes/:stockcodes',
    getbycode: '/bycode/:stockcode',
    getNotice: '/getnotice/:stockcode',
    //补日报表
    supplyDayRpt: '/supplydayrpt/:startday/:endday/:stockcode',
} as const;



/**
 * Get all dayrpt by day.
 */
router.get(p.getstocks, async (req: Request, res: Response) => {

    const { stockcodes } = req.params;

    const stocks = await tencentstockService.getstockList(stockcodes);
    return res.status(OK).json({ stocks });
});


/**
 * Get all dayrpt by code.
 */
router.get(p.getbycode, async (req: Request, res: Response) => {

    const { stockcode } = req.params;
    const stock = await tencentstockService.getone(stockcode);
    return res.status(OK).json({ stock });
});

/**
 * 获取公告
 */
router.get(p.getNotice, async (req: Request, res: Response) => {

    const { stockcode } = req.params;
    const noticelist = await tencentstockService.getnotice(stockcode);
    return res.status(OK).json({ noticelist });
});

/**
 * 补充日报
 */
router.get(p.supplyDayRpt, async (req: Request, res: Response) => {

    const { startday, endday, stockcode } = req.params;
    var startdate: Date = new Date(startday);
    var enddate: Date = new Date(endday);
    const dayrptlist = await tencentstockService.getdayrpt(startdate, enddate, stockcode);

    if (dayrptlist.length == 0) { res.status(OK).end("no data"); }


    for (let index = 0; index < dayrptlist.length; index++) {
        const element = dayrptlist[index];
        if (await dayrptService.persists(element.ReportDay, element.StockCode)) { console.log(element.ReportDay.toDateString()); continue; }

        await dayrptService.addone(element);

    }


    return res.status(OK).json({ dayrptlist });
});


// Export default
export default router;
