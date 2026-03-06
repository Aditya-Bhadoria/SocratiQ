import { PrismaClient } from "@prisma/client";

// This ensures we don't exhaust our database connection limit in development mode
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;