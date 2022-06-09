import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';

import userService from '@services/user-service';
import { ParamMissingError } from '@shared/errors';
import authService from '@services/auth-service';
import jwtUtil from '@util/jwt-util';



// Constants
const router = Router();
const { CREATED, OK } = StatusCodes;

// Paths
export const p = {
    get: '/all',
    add: '/add',
    update: '/update',
    delete: '/delete/:id',
    getone: '/getone/',
} as const;



/**
 * Get all users.
 */
router.get(p.get, async (_: Request, res: Response) => {
    const users = await userService.getAll();
    return res.status(OK).json({ users });
});


/**
 * Get one user.
 */
router.get(p.getone, async (req: Request, res: Response) => {
    // const { username } = req.params;
    const { authorization } = req.headers;
    const clientData = await jwtUtil.decode(String(authorization));
    if (typeof clientData === 'object') {
        const users = await userService.getOne(clientData.name);
        return res.status(OK).json({ users });
    }

    return res.status(OK)
});


/**
 * Add one user.
 */
router.post(p.add, async (req: Request, res: Response) => {
    const { user } = req.body;
    user.Password = await authService.ChangePwd(user.Password);
    console.log(user);
    // Check param
    if (!user) {
        throw new ParamMissingError();
    }
    // Fetch data
    await userService.addOne(user);
    return res.status(CREATED).end();
});


/**
 * Update one user.
 */
router.put(p.update, async (req: Request, res: Response) => {
    const { user } = req.body;
    // Check param
    if (!user) {
        throw new ParamMissingError();
    }
    // Fetch data
    await userService.updateOne(user);
    return res.status(OK).end();
});


/**
 * Delete one user.
 */
router.delete(p.delete, async (req: Request, res: Response) => {
    const { id } = req.params;
    // Check param
    if (!id) {
        throw new ParamMissingError();
    }
    // Fetch data
    await userService.deleteOne(String(id));
    return res.status(OK).end();
});


// Export default
export default router;

export enum UserRoles {
    Admin,
    Standard,
}
