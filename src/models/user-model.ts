
export enum UserRoles {
    Admin,
    Standard,
}

export interface IUser {
    UserID: string;
    UserName: string;
    Password: string;
    RoleID: number;
    IsEnabled: boolean;
    UpdateAt: Date | null;
}
function getNew(
    name: string,
    email: string,
    role?: UserRoles,
    pwdHash?: string,
): IUser {
    void email;
    return {
        UserID: '-1',
        UserName: name,
        Password: pwdHash ?? '',
        RoleID: role ?? UserRoles.Standard,
        IsEnabled: true,
        UpdateAt: null,
    };
}


function copy(user: IUser): IUser {
    return {
        UserID: user.UserID,
        UserName: user.UserName,
        Password: user.Password,
        RoleID: user.RoleID,
        IsEnabled: user.IsEnabled,
        UpdateAt: user.UpdateAt,
    };
}
export default {
    new: getNew,
    copy,
} as const;
