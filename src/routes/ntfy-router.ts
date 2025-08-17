import StatusCodes from 'http-status-codes';
import ntfyService from '@services/ntfy-service';
import { Request, Response, Router } from 'express';

// Constants
const router = Router();
const { CREATED, OK } = StatusCodes;

// Paths
export const p = {
    sendnotice: '/sendnotice/:postmessage',
} as const;

/**
 * sendnotice.
 */
router.get(p.sendnotice, async (req: Request, res: Response) => {
    const { postmessage } = req.params;
    
    await ntfyService.sendPostRequest(postmessage);
    return res.status(OK).end();
});

export default router;