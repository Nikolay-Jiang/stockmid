import bcrypt from 'bcrypt';
import userRepo from '@repos/user-repo';
import jwtUtil from '@util/jwt-util';
import { UnauthorizedError } from '@shared/errors';



/**
 * Login()
 * 
 * @param username 
 * @param password 
 * @returns 
 */
async function login(username: string, password: string): Promise<string> {
    // Fetch user
    const user = await userRepo.getOne(username);
    if (!user) {
        throw new UnauthorizedError();
    }
    // Check password
    const pwdPassed = await bcrypt.compare(password, user.Password);
    if (!pwdPassed) {
        throw new UnauthorizedError();
    }
    // Setup Admin Cookie
    return jwtUtil.sign({
        id: user.UserID,
        name: user.UserName,
        role: user.RoleID,
        LoginDate: new Date(),
    });
}

async function ChangePwd(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
}


// Export default
export default {
    login, ChangePwd
} as const;
