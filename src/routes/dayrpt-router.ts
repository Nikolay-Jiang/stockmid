import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';
import dayrptService from '@services/dayrpt-service';




// Constants
const router = Router();
const { CREATED, OK } = StatusCodes;

// Paths
export const p = {
    getbyrptday: '/allbyday/:reportday',
    getbycode: '/allbycode/:stockcode',
    getbyconditicon: '/allbycondition/:startday/:endday/:stockcode'
} as const;



/**
 * Get all dayrpt by day.
 */
router.get(p.getbyrptday, async (req: Request, res: Response) => {

    const { reportday } = req.params;
    var day: Date = new Date(reportday);
    day.setHours(day.getHours() + 8);
    const dayrpts = await dayrptService.getDayrptByReportDay(day);
    return res.status(OK).json({ dayrpts });
});


/**
 * Get all dayrpt by code.
 */
router.get(p.getbycode, async (req: Request, res: Response) => {

    const { stockcode } = req.params;
    const dayrpts = await dayrptService.getDayrptByCode(stockcode);
    return res.status(OK).json({ dayrpts });
});

/**
 * Get all dayrpt by condition.
 */
 router.get(p.getbyconditicon, async (req: Request, res: Response) => {

    const { startday,endday, stockcode } = req.params;
    var begindate:Date=new Date(startday);
    var enddate:Date=new Date(endday);
    
    //修车UTC存储问题
    begindate.setHours(begindate.getHours()+8)
    enddate.setHours(enddate.getHours()+8)

    const dayrpts = await dayrptService.getDayrptByCondition(begindate,enddate,stockcode);
    return res.status(OK).json({ dayrpts });
});



// Export default
export default router;