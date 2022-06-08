import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';

import predictService from '@services/predict-service';




// Constants
const router = Router();
const { CREATED, OK } = StatusCodes;

// Paths
export const p = {
    get: '/getallbyday/:startday/:endday',
} as const;



/**
 * Get all observers.
 */
router.get(p.get, async (req: Request, res: Response) => {
    const { startday, endday } = req.params;
    var startdate = new Date(startday);
    var enddate = new Date(endday);
    const predicts = await predictService.getPredictByPredictTime(startdate, enddate);
    return res.status(OK).json({ predicts });
});


// Export default
export default router;
