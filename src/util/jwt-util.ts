
import jsonwebtoken, { JwtPayload } from 'jsonwebtoken';


// Errors
const errors = {
    validation: 'JSON-web-token validation failed.',
} as const;

// Constants
const secret: string = (() => {
    const s = process.env.JWT_SECRET;
    if (!s) {
        throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start without it.');
    }
    return s;
})();
const options = {expiresIn: process.env.COOKIE_EXP};


// Types
type TDecoded = string | JwtPayload | undefined;



/**
 * Encrypt data and return jwt.
 *
 * @param data
 */
function sign(data: JwtPayload): Promise<string> {
    return new Promise((resolve, reject) => {
        jsonwebtoken.sign(data, secret, options, (err, token) => {
            err ? reject(err) : resolve(token || '');
        });
    });
}


/**
 * Decrypt JWT and extract client data.
 *
 * @param jwt
 */
function decode(jwt: string): Promise<TDecoded> {
    return new Promise((res, rej) => {
        jsonwebtoken.verify(jwt, secret, (err, decoded) => {
            return err ? rej(errors.validation) : res(decoded);
        });
    });
}



// Export default
export default {
    sign,
    decode,
}
