import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { quizversePrisma?: PrismaClient };
export function getPrisma() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("Turso database is not configured");
  if (!globalForPrisma.quizversePrisma) {
    const adapter = new PrismaLibSQL({ url, authToken: process.env.TURSO_AUTH_TOKEN });
    globalForPrisma.quizversePrisma = new PrismaClient({ adapter });
  }
  return globalForPrisma.quizversePrisma;
}
export const isDatabaseConfigured = () => Boolean(process.env.TURSO_DATABASE_URL);
