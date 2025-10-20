import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Singleton pattern para reutilizar conexão
export const prisma = global.prisma || new PrismaClient();
global.prisma = prisma;
