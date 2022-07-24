import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';
import sinastockService from '@services/sinastock-service';




// Constants
const router = Router();
const { CREATED, OK } = StatusCodes;

// Paths
export const p = {
    getstocks: '/allbycodes/:stockcodes',
    getbycode: '/bycode/:stockcode',
    getNotice: '/getnotice/:stockcode',
} as const;



/**
 * Get all dayrpt by day.
 */
router.get(p.getstocks, async (req: Request, res: Response) => {

    const { stockcodes } = req.params;

    const stocks = await sinastockService.getstockList(stockcodes);
    return res.status(OK).json({ stocks });
});


/**
 * Get all dayrpt by code.
 */
router.get(p.getbycode, async (req: Request, res: Response) => {

    const { stockcode } = req.params;
    const stock = await sinastockService.getone(stockcode);
    return res.status(OK).json({ stock });
});

router.get(p.getNotice, async (req: Request, res: Response) => {

    const { stockcode } = req.params;
    const noticelist = await sinastockService.getnotice(stockcode);
    return res.status(OK).json({ noticelist });
});


// Export default
export default router;
