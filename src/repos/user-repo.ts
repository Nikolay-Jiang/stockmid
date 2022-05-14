import { GetID } from '@shared/functions';
import { PrismaClient, t_User } from '@prisma/client'
const prisma = new PrismaClient();

/**
 * Get one user.
 * 
 * @param username 
 * @returns 
 */
async function getOne(username: string): Promise<t_User | null> {
  const user = await prisma.t_User.findFirst({
    where: {
      UserName: username,
    },
  })
  
  if (user != null) {
    if (!user.IsEnabled) {
      return null
    }
    return user
  }

  return null;
}


/**
 * See if a user with the given id exists.
 * 
 * @param id 
 */
async function persists(id: string): Promise<boolean> {
  const user = await prisma.t_User.findUnique({
    where: {
      UserID: id,
    },
  })
  if (user != null) {
    return true;
  }
  return false;
}


/**
 * Get all users.
 * 
 * @returns 
 */
async function getAll(): Promise<t_User[]> {
  return await prisma.t_User.findMany();
}


/**
 * Add one user.
 * 
 * @param user 
 * @returns 
 */
async function add(user: t_User): Promise<void> {

  const post = await prisma.t_User.create({
    data: {
      UserID: GetID(),
      UserName: user.UserName,
      Password: user.Password
    },
  })


  // return orm.saveDb(db);
}


/**
 * Update a user.
 * 
 * @param user 
 * @returns 
 */
async function update(user: t_User): Promise<void> {
  const post = await prisma.t_User.update({
    where: {
      UserID: user.UserID,
    },
    data: {
      UserName: user.UserName,
      Password: user.Password,
      UpdateAt: new Date()
    },
  })
}


/**
 * Delete one user.
 * 
 * @param id 
 * @returns 
 */
async function deleteOne(id: string): Promise<void> {
  const deleteUser = await prisma.t_User.delete({
    where: {
      UserID: id,
    },
  })
}


// Export default
export default {
  getOne,
  persists,
  getAll,
  add,
  update,
  delete: deleteOne,
} as const;
