import { PrismaClient } from "@/generated/prisma";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function createPrismaClient() {
  const url =
    process.env.DATABASE_URL ??
    `file:/Volumes/AlphA DataLink/DL_Project/AlphA Bank/alpha-bank/prisma/dev.db`;

  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
