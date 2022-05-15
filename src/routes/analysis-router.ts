import StatusCodes, { TOO_MANY_REQUESTS } from 'http-status-codes';
import { Request, Response, Router } from 'express';
import dayrptService from '@services/dayrpt-service';


// Constants
const router = Router();
const { CREATED, OK } = StatusCodes;

// Paths
export const p = {
    getbyconditicon: '/allbycondition/:startday/:endday/:stockcode'
} as const;


/**
 * Get all dayrpt by condition.
 */
 router.get(p.getbyconditicon, async (req: Request, res: Response) => {

    const { startday,endday, stockcode } = req.params;
    var begindate:Date=new Date(startday);
    var enddate:Date=new Date(endday);
    
    //修车UTC存储问题
    if (begindate.getHours()==0) {
        begindate.setHours(begindate.getHours()+8)    
    }
    if (enddate.getHours()==0) {
        enddate.setHours(enddate.getHours()+8)    
    }

    var dayrpt=await dayrptService.getDayrptByCondition(begindate,enddate,stockcode)
    if (dayrpt==null) {
        return;
    }
    // dayrpt.sort((a,b)=>parseFloat(a!.RatePrice.toString())-b!.RatePrice);


});



// Export default
export default router;
