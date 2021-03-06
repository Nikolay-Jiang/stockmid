import StatusCodes from 'http-status-codes';
import { Request, Response, NextFunction } from 'express';

import { UserRoles } from '@routes/user-router';
import { cookieProps } from '@routes/auth-router';
import jwtUtil from '@util/jwt-util';


// Constants
const { UNAUTHORIZED } = StatusCodes;
const jwtNotPresentErr = 'JWT not present in signed cookie.';


/**
 * Middleware to verify if user is an admin.
 * 
 * @param req 
 * @param res 
 * @param next 
 * @returns 
 */
export async function adminMw(req: Request, res: Response, next: NextFunction) {
    try {
        // Get json-web-token
        const jwt = req.signedCookies[cookieProps.key];
        if (!jwt) {
            throw Error(jwtNotPresentErr);
        }
        // Make sure user role is an admin
        console.log(jwt);
        const clientData = await jwtUtil.decode(jwt);
        
        if (typeof clientData === 'object' && clientData.role === UserRoles.Admin) {
            res.locals.sessionUser = clientData;
            next();
        } else {
            throw Error(jwtNotPresentErr);
        }
    } catch (err) {
        return res.status(UNAUTHORIZED).json({
            error: err.message,
        });
    }
};

export async function GetUserID(req: Request) :Promise<string> {
    const jwt = req.signedCookies[cookieProps.key];
        if (!jwt) {
            throw Error(jwtNotPresentErr);
        }
        // Make sure user role is an admin
        const clientData = await jwtUtil.decode(jwt);
        if (typeof clientData === 'object' ) {
            return clientData.id
        }

        throw Error(jwtNotPresentErr);
        
    
}

export async function GetUserIDByHeader(jwtstr:string) :Promise<string> {
    
        if (!jwtstr) {
            throw Error(jwtNotPresentErr);
        }
        // Make sure user role is an admin
        const clientData = await jwtUtil.decode(jwtstr);
        if (typeof clientData === 'object' ) {
            return clientData.id
        }

        throw Error(jwtNotPresentErr);
        
    
}
