import { PrismaClient } from '@prisma/client';

/**
 * 全进程共享一个 PrismaClient，避免每个 repo 各建一个连接池。
 */
const prisma = new PrismaClient();

export default prisma;
