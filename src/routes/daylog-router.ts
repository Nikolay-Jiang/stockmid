import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';
import daylogService from '@services/daylog-service';




// Constants
const router = Router();
const { CREATED, OK } = StatusCodes;

// Paths
export const p = {
    getbyconditicon: '/allbycondition/:startday/:endday/:stockcode'
} as const;



/**
 * Get all daylog by condition.
 */
 router.get(p.getbyconditicon, async (req: Request, res: Response) => {

    const { startday,endday, stockcode } = req.params;
    var begindate:Date=new Date(startday);
    var enddate:Date=new Date(endday);
    
    //修车UTC存储问题
    begindate.setHours(begindate.getHours()+8)
    enddate.setHours(enddate.getHours()+8)

    const daylogs = await daylogService.getDaylogByCondition(begindate,enddate,stockcode);
    return res.status(OK).json({ daylogs });
});



// Export default
export default router;
