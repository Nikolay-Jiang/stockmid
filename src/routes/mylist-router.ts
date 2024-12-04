import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';

import { GetUserID } from './middleware';
import observerService from '@services/observer-service';
import tencentstockService from '@services/tencentstock-service';
import dayrptService from '@services/dayrpt-service';


// Constants
const router = Router();
const { CREATED, OK } = StatusCodes;

// Paths
export const p = {
    getMylist: '/all',
    add: '/add',
    update: '/update',
} as const;



/**
 * Get all observers.
 */
router.get(p.getMylist, async (req: Request, res: Response) => {

    var userid = await GetUserID(req);
    const observers = await observerService.getAll(userid);
    if (observers == null) {
        return;
    }

    //获取当前价格
    var stockcodes = '';
    observers.forEach(element => {
        stockcodes += element.StockCode + ",";
    });

    const stocklist = await tencentstockService.getstockList(stockcodes);

    //获取observer 中 第一个过去 30天内产生的日报数据
    var beginday = new Date();
    beginday.setDate(beginday.getDate() - 30);
    var endday = new Date();

    const dayrptlist = await dayrptService.getDayrptByCondition(beginday, endday, observers[0].StockCode);

    return res.status(OK).json({ observers, stocklist, dayrptlist });
});





// Export default
export default router;
